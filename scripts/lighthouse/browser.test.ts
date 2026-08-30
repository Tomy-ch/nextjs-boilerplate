import { describe, expect, it, vi } from "vitest";

import { type BrowserCookie, putCookies, startBrowser } from "./browser";

const COOKIE: BrowserCookie = {
  domain: "127.0.0.1",
  name: "consent_choice",
  path: "/",
  value: "denied.1",
};

/**
 * ブラウザの代わりに待ち受け先を書き出すだけの実体。
 *
 * @remarks
 * `--user-data-dir=` の指定を引数から拾って、そこへ本物と同じ 2 行を書きます。本物を起動すると
 * 実行のたびにブラウザが 1 つ立ち上がり、待ち時間も後片付けも実機の都合に引きずられます。
 */
function fakeBrowser(delayMs = 0): string[] {
  const code = [
    "const fs = require('node:fs');",
    "const dir = process.argv.find((a) => a.startsWith('--user-data-dir=')).slice(16);",
    `setTimeout(() => fs.writeFileSync(dir + '/DevToolsActivePort', '9911\\n/devtools/browser/x'), ${String(delayMs)});`,
    "setTimeout(() => {}, 3000);",
  ].join("");

  // `--` を挟まないと、続く `--remote-debugging-port=` を node が自分の指定として読んで落ちる。
  return ["-e", code, "--"];
}

/** 送られた値を溜める偽の口。 */
function stubSocket(behave: (socket: FakeSocket) => void) {
  class FakeSocket {
    readonly sent: string[] = [];
    closed = false;
    private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

    addEventListener(type: string, listener: (event: unknown) => void) {
      this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);

      if (type === "message") {
        queueMicrotask(() => behave(this));
      }
    }

    send(data: string) {
      this.sent.push(data);
    }

    close() {
      this.closed = true;
    }

    emit(type: string, event: unknown) {
      for (const listener of this.listeners.get(type) ?? []) listener(event);
    }
  }

  const sockets: FakeSocket[] = [];

  vi.stubGlobal(
    "WebSocket",
    class {
      constructor() {
        const socket = new FakeSocket();

        sockets.push(socket);

        // biome-ignore lint/correctness/noConstructorReturn: 生成した偽物をそのまま呼び出し側へ渡す
        return socket;
      }
    },
  );

  return sockets;
}

type FakeSocket = {
  readonly sent: string[];
  closed: boolean;
  emit: (type: string, event: unknown) => void;
};

describe("startBrowser", () => {
  // ----- 正常系 -----
  it("書き出された待ち受け先から、繋ぎ先を組み立てる", async () => {
    const browser = await startBrowser(process.execPath, fakeBrowser(), 5_000);

    expect(browser).toMatchObject({ port: 9911, wsUrl: "ws://127.0.0.1:9911/devtools/browser/x" });

    browser.close();
  });

  it("書き出しが遅れても待つ", async () => {
    const browser = await startBrowser(process.execPath, fakeBrowser(300), 5_000);

    expect(browser.port).toBe(9911);

    browser.close();
  });

  it("片付けは二度呼んでも落ちない", async () => {
    const browser = await startBrowser(process.execPath, fakeBrowser(), 5_000);

    browser.close();

    expect(() => browser.close()).not.toThrow();
  });

  // ----- 異常系 -----
  it("待ち受ける前に終了したら、そう言って落ちる", async () => {
    await expect(
      startBrowser(process.execPath, ["-e", "process.exit(3)", "--"], 5_000),
    ).rejects.toThrow(/終了コード 3/);
  });

  it("待っても始まらなければ、上限を告げて落ちる", async () => {
    await expect(
      startBrowser(process.execPath, ["-e", "setTimeout(() => {}, 3000)", "--"], 200),
    ).rejects.toThrow(/200ms で待ち受けを始めませんでした/);
  });
});

describe("putCookies", () => {
  // ----- 正常系 -----
  it("置くものが無ければ繋がない", async () => {
    const sockets = stubSocket(() => undefined);

    await putCookies("ws://127.0.0.1:1/x", []);

    expect(sockets).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it("`Storage.setCookies` として送り、答えが返れば閉じる", async () => {
    const sockets = stubSocket((socket) => {
      socket.emit("open", {});
      socket.emit("message", { data: JSON.stringify({ id: 1, result: {} }) });
    });

    await putCookies("ws://127.0.0.1:1/x", [COOKIE]);

    expect(JSON.parse(sockets[0]?.sent[0] ?? "{}")).toMatchObject({
      method: "Storage.setCookies",
      params: { cookies: [COOKIE] },
    });
    expect(sockets[0]?.closed).toBe(true);
    vi.unstubAllGlobals();
  });

  it("別の遣り取りの答えは読み飛ばす", async () => {
    stubSocket((socket) => {
      socket.emit("open", {});
      socket.emit("message", { data: JSON.stringify({ id: 99, result: {} }) });
      socket.emit("message", { data: JSON.stringify({ id: 1, result: {} }) });
    });

    await expect(putCookies("ws://127.0.0.1:1/x", [COOKIE])).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });

  // ----- 異常系 -----
  it("置けなかったと返れば、その理由ごと落ちる", async () => {
    stubSocket((socket) => {
      socket.emit("open", {});
      socket.emit("message", { data: JSON.stringify({ error: { message: "bad domain" }, id: 1 }) });
    });

    await expect(putCookies("ws://127.0.0.1:1/x", [COOKIE])).rejects.toThrow(/bad domain/);
    vi.unstubAllGlobals();
  });

  it("口へ繋げなければ落ちる", async () => {
    stubSocket((socket) => socket.emit("error", {}));

    await expect(putCookies("ws://127.0.0.1:1/x", [COOKIE])).rejects.toThrow(/繋げませんでした/);
    vi.unstubAllGlobals();
  });
});

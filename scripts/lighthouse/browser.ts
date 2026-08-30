import { type ChildProcess, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** ブラウザへ置く cookie 1 つぶん。 */
export type BrowserCookie = {
  /** 名前。 */
  readonly name: string;
  /** 値。 */
  readonly value: string;
  /** 効かせる宛先。ポートは含めない。 */
  readonly domain: string;
  /** 効かせる経路。 */
  readonly path: string;
};

/** 立ち上げたブラウザ。 */
export type Browser = {
  /** CDP を受け付けているポート。Lighthouse へ `--port` で渡す。 */
  readonly port: number;
  /** 落として profile を片付ける。 */
  readonly close: () => void;
};

/** ブラウザが CDP を受け付けるまで待つ上限。 */
const READY_TIMEOUT_MS = 20_000;

/** 待つあいだの間隔。 */
const POLL_INTERVAL_MS = 100;

/** 空いている TCP ポートを 1 つ取る。 */
async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();

    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();

      if (typeof address !== "object" || address === null) {
        probe.close(() => reject(new Error("空きポートを取れませんでした")));

        return;
      }

      probe.close(() => resolve(address.port));
    });
  });
}

/** CDP の入口が答えるようになるまで待ち、browser の口を返す。 */
async function waitForEndpoint(port: number, child: ChildProcess): Promise<string> {
  const deadline = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`ブラウザが起動前に終了しました（終了コード ${String(child.exitCode)}）`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      const body = (await response.json()) as { webSocketDebuggerUrl?: string };

      if (body.webSocketDebuggerUrl !== undefined) {
        return body.webSocketDebuggerUrl;
      }
    } catch {
      // まだ待ち受けていないだけなので、間を置いてもう一度見る。
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`ブラウザが ${READY_TIMEOUT_MS}ms で CDP を受け付けませんでした`);
}

/**
 * 計測に使うブラウザを立ち上げる。
 *
 * @remarks
 * **Lighthouse に起動させず、こちらで起動します。** CLI へ渡せるのは要求ヘッダの追加までで、
 * ブラウザの cookie 置き場へは触れないためです（{@link putCookies}）。同意を選び終えた状態から
 * 測るには本物の cookie が要ります。
 *
 * profile は実行ごとの使い捨てにします。使い回すと、前の実行が残したキャッシュや cookie が
 * 次の数値へ効き、同じ木を測っても回ごとに違う答えが出ます。
 *
 * @param executablePath - 起動する実体。版は lockfile の `@playwright/test` が決める。
 * @param flags - 起動時の指定（`buildChromeFlags`）。
 */
export async function startBrowser(
  executablePath: string,
  flags: readonly string[],
): Promise<Browser> {
  const port = await findFreePort();
  const profile = mkdtempSync(join(tmpdir(), "lighthouse-profile-"));
  const child = spawn(
    executablePath,
    [
      ...flags,
      `--remote-debugging-port=${String(port)}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  // profile の後片付けは、落ちても計測を落とさない。ブラウザが終了しきる前に消しに行くと
  // 書き込み中のファイルが残って `ENOTEMPTY` になるが、それは残骸であって計測の失敗ではない。
  const close = () => {
    child.kill();

    try {
      rmSync(profile, { force: true, maxRetries: 20, recursive: true, retryDelay: 100 });
    } catch {
      // 使い捨ての置き場なので、消せなくても次の実行に影響しない。
    }
  };

  try {
    await waitForEndpoint(port, child);
  } catch (cause) {
    close();

    throw cause;
  }

  return { close, port };
}

/**
 * ブラウザの cookie 置き場へ直に置く。
 *
 * @remarks
 * `Storage.setCookies` は browser の口で答えるため、頁を開く前に置けます。開いてから置くと、
 * 最初の描画は cookie が無い状態で行われ、置いた意味が無くなります。
 *
 * @param endpoint - `startBrowser` が待ち受けている CDP の口。
 * @param cookies - 置く cookie。
 */
export async function putCookies(
  port: number,
  cookies: readonly BrowserCookie[],
): Promise<void> {
  if (cookies.length === 0) {
    return;
  }

  const endpoint = await fetch(`http://127.0.0.1:${port}/json/version`)
    .then((response) => response.json() as Promise<{ webSocketDebuggerUrl: string }>)
    .then((body) => body.webSocketDebuggerUrl);

  await new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(endpoint);

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ id: 1, method: "Storage.setCookies", params: { cookies } }));
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as { id?: number; error?: { message: string } };

      if (message.id !== 1) {
        return;
      }

      socket.close();

      if (message.error === undefined) {
        resolve();
      } else {
        reject(new Error(`cookie を置けませんでした: ${message.error.message}`));
      }
    });

    socket.addEventListener("error", () => reject(new Error("CDP の口へ繋げませんでした")));
  });
}

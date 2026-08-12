import { once } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { contentType, createStaticServer, resolveFilePath } from "./static-server";

let root: string;

/** 配信ディレクトリへファイルを置く。途中のディレクトリも作る。 */
function write(relative: string, content: string): void {
  const file = join(root, relative);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, content);
}

/** 立てたサーバへ 1 回だけ要求を出す。 */
async function get(path: string): Promise<{ status: number; type: string | null; body: string }> {
  const server = createStaticServer(root).listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);

    return {
      status: response.status,
      type: response.headers.get("content-type"),
      body: await response.text(),
    };
  } finally {
    server.close();
  }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "static-server-"));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("contentType", () => {
  // ----- 正常系 -----
  it("拡張子に対応する型を返す", () => {
    expect(contentType("iframe.html")).toBe("text/html; charset=utf-8");
    expect(contentType("assets/main.js")).toBe("text/javascript; charset=utf-8");
  });

  it("大文字の拡張子も同じ型に落とす", () => {
    expect(contentType("LOGO.PNG")).toBe("image/png");
  });

  // ----- 異常系 -----
  it("対応表に無い拡張子はバイト列として返す", () => {
    expect(contentType("unknown.bin")).toBe("application/octet-stream");
  });
});

describe("resolveFilePath", () => {
  // ----- 正常系 -----
  it("URL を配信ディレクトリ内の絶対パスへ解決する", () => {
    expect(resolveFilePath("/srv", "/assets/main.js")).toBe("/srv/assets/main.js");
  });

  it("クエリを落としてパスだけを見る", () => {
    expect(resolveFilePath("/srv", "/iframe.html?id=a--b")).toBe("/srv/iframe.html");
  });

  it("百分率符号化された文字を戻して解決する", () => {
    expect(resolveFilePath("/srv", "/a%20b.png")).toBe("/srv/a b.png");
  });

  // ----- 異常系 -----
  it("上位ディレクトリの指定は符号化の有無によらず配信ディレクトリ内へ畳まれる", () => {
    expect(resolveFilePath("/srv", "/../etc/passwd")).toBe("/srv/etc/passwd");
    expect(resolveFilePath("/srv", "/%2e%2e/etc/passwd")).toBe("/srv/etc/passwd");
  });

  it("配信ディレクトリ自身を指す URL を拒む", () => {
    expect(resolveFilePath("/srv", "/")).toBeNull();
  });
});

describe("createStaticServer", () => {
  // ----- 正常系 -----
  it("配信ディレクトリのファイルを型付きで返す", async () => {
    write("iframe.html", "<!doctype html>");

    await expect(get("/iframe.html")).resolves.toEqual({
      status: 200,
      type: "text/html; charset=utf-8",
      body: "<!doctype html>",
    });
  });

  // ----- 異常系 -----
  it("存在しないファイルを 404 で返す", async () => {
    await expect(get("/不在.html")).resolves.toMatchObject({ status: 404 });
  });

  it("ディレクトリへの要求を 404 で返す", async () => {
    mkdirSync(join(root, "assets"));

    await expect(get("/assets")).resolves.toMatchObject({ status: 404 });
  });

  it("配信ディレクトリ自身への要求を 404 で返す", async () => {
    await expect(get("/")).resolves.toMatchObject({ status: 404 });
  });
});

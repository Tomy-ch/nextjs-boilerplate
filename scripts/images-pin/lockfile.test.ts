import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LOCK_FILE, readLock, readLockOrEmpty, writeLock } from "./lockfile";

const DIGEST = `sha256:${"a".repeat(64)}`;

let root: string;
let lockPath: string;

/** ロックファイルの内容を差し替える。 */
function writeRaw(content: string): void {
  writeFileSync(lockPath, content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "images-pin-lock-"));
  lockPath = join(root, "images-pin.toml");
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("LOCK_FILE", () => {
  // ----- 正常系 -----
  it("ロックファイルの位置をリポジトリ相対で示す", () => {
    expect(LOCK_FILE).toBe("docker/images-pin.toml");
  });
});

describe("readLock", () => {
  // ----- 正常系 -----
  it("代入行を image:tag → digest の対応として読む", () => {
    writeRaw(`"alpine:3.24" = "${DIGEST}"\n`);

    expect(readLock(lockPath)).toEqual(new Map([["alpine:3.24", DIGEST]]));
  });

  // ----- 異常系 -----
  it("sha256 の 64 桁でない digest を落とす", () => {
    writeRaw(`"alpine:3.24" = "sha256:abc"\n`);

    expect(() => readLock(lockPath)).toThrow(/digest が sha256 の 64 桁 16 進ではありません/);
  });

  it("digest 以外の値を落とす", () => {
    writeRaw(`"alpine:3.24" = "3.24"\n`);

    expect(() => readLock(lockPath)).toThrow(/digest が sha256 の 64 桁 16 進ではありません/);
  });
});

describe("readLockOrEmpty", () => {
  // ----- 異常系 -----
  it("ファイル不在だけを空として扱う", () => {
    expect(readLockOrEmpty(join(root, "不在.toml"))).toEqual(new Map());
  });
});

describe("writeLock", () => {
  // ----- 正常系 -----
  it("解決と反映の手順を示す見出しを添えて書き出す", () => {
    writeLock(lockPath, new Map([["alpine:3.24", DIGEST]]));

    expect(readFileSync(lockPath, "utf8")).toBe(
      [
        "# container image の pin 対象 digest（SSOT）。",
        "# make images-pin-resolve で解決し、make images-pin-apply で compose / Dockerfile へ反映する。",
        `"alpine:3.24" = "${DIGEST}"`,
        "",
      ].join("\n"),
    );
  });

  it("書き出した内容を readLock で読み戻せる", () => {
    const lock = new Map([["alpine:3.24", DIGEST]]);
    writeLock(lockPath, lock);

    expect(readLock(lockPath)).toEqual(lock);
  });
});

import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { type LockFormat, readLock, readLockOrEmpty, writeLock } from "./pin-lockfile";

const VALUE = "sha256:0000000000000000000000000000000000000000000000000000000000000000";
const OTHER_VALUE = "sha256:1111111111111111111111111111111111111111111111111111111111111111";

const FORMAT: LockFormat = {
  entryLabel: '"<image>:<tag>" = "sha256:<64hex>"',
  value: /^sha256:[0-9a-f]{64}$/,
  valueLabel: "digest が sha256 の 64 桁",
  header: ["# 見出し", "# 2 行目"],
};

let root: string;
let lockPath: string;

/** ロックファイルの内容を差し替える。 */
function writeRaw(content: string): void {
  writeFileSync(lockPath, content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pin-lock-"));
  lockPath = join(root, "pin.toml");
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("readLock", () => {
  // ----- 正常系 -----
  it("代入行をキー → 値の対応として読む", () => {
    writeRaw(`"alpine:3.24" = "${VALUE}"\n`);

    expect(readLock(lockPath, FORMAT)).toEqual(new Map([["alpine:3.24", VALUE]]));
  });

  it("コメント行と空行を読み飛ばす", () => {
    writeRaw(`# 見出し\n\n"alpine:3.24" = "${VALUE}"\n`);

    expect(readLock(lockPath, FORMAT).size).toBe(1);
  });

  it("前後の空白を無視して読む", () => {
    writeRaw(`  "alpine:3.24" = "${VALUE}"  \n`);

    expect(readLock(lockPath, FORMAT).size).toBe(1);
  });

  // ----- 異常系 -----
  it("代入形でない行を、正しい書き方を添えて行番号付きで落とす", () => {
    writeRaw(`"alpine:3.24"\n`);

    expect(() => readLock(lockPath, FORMAT)).toThrow(/:1 形式が不正です（"<image>:<tag>"/);
  });

  it("与えた形に合わない値を落とす", () => {
    writeRaw(`"alpine:3.24" = "3.24"\n`);

    expect(() => readLock(lockPath, FORMAT)).toThrow(
      /:1 digest が sha256 の 64 桁ではありません: 3\.24/,
    );
  });

  it("キーの重複を落とす", () => {
    writeRaw(`"alpine:3.24" = "${VALUE}"\n"alpine:3.24" = "${OTHER_VALUE}"\n`);

    expect(() => readLock(lockPath, FORMAT)).toThrow(/:2 キーが重複しています: alpine:3\.24/);
  });

  it("ファイルが無ければ読み取り失敗を投げる", () => {
    expect(() => readLock(join(root, "不在.toml"), FORMAT)).toThrow();
  });
});

describe("readLockOrEmpty", () => {
  // ----- 正常系 -----
  it("読めるロックファイルはそのまま読む", () => {
    writeRaw(`"alpine:3.24" = "${VALUE}"\n`);

    expect(readLockOrEmpty(lockPath, FORMAT).size).toBe(1);
  });

  // ----- 異常系 -----
  it("ファイル不在だけを空として扱う", () => {
    expect(readLockOrEmpty(join(root, "不在.toml"), FORMAT)).toEqual(new Map());
  });

  it("壊れた行は握り潰さずに投げる", () => {
    writeRaw("壊れた行\n");

    expect(() => readLockOrEmpty(lockPath, FORMAT)).toThrow(/形式が不正です/);
  });
});

describe("writeLock", () => {
  // ----- 正常系 -----
  it("与えた見出しを添えてキー順に書き出す", () => {
    writeLock(
      lockPath,
      new Map([
        ["alpine:3.24", VALUE],
        ["nginx:1.31", OTHER_VALUE],
      ]),
      FORMAT,
    );

    const lines = readFileSync(lockPath, "utf8").split("\n");

    expect(lines.slice(0, 4)).toEqual([
      "# 見出し",
      "# 2 行目",
      `"alpine:3.24" = "${VALUE}"`,
      `"nginx:1.31" = "${OTHER_VALUE}"`,
    ]);
  });

  it("書き出した内容を readLock で読み戻せる", () => {
    const lock = new Map([["alpine:3.24", VALUE]]);
    writeLock(lockPath, lock, FORMAT);

    expect(readLock(lockPath, FORMAT)).toEqual(lock);
  });

  it("読み取り専用でない一般的な権限で書き出す", () => {
    writeLock(lockPath, new Map(), FORMAT);

    expect(statSync(lockPath).mode & 0o777).toBe(0o644);
  });

  // ----- 異常系 -----
  it("空のロックでも見出しだけを書き出す", () => {
    writeLock(lockPath, new Map(), FORMAT);

    expect(readLock(lockPath, FORMAT)).toEqual(new Map());
  });
});

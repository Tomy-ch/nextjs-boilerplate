import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LOCK_FILE, readLock, readLockOrEmpty, writeLock } from "./lockfile";

const SHA = "9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0";
const OTHER_SHA = "bf7454d06d71f1098171f2acdf0cd4708d7b5920";

let root: string;
let lockPath: string;

/** ロックファイルの内容を差し替える。 */
function writeRaw(content: string): void {
  writeFileSync(lockPath, content);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "actions-pin-lock-"));
  lockPath = join(root, "actions-pin.toml");
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("LOCK_FILE", () => {
  // ----- 正常系 -----
  it("ロックファイルの位置をリポジトリ相対で示す", () => {
    expect(LOCK_FILE).toBe(".github/actions-pin.toml");
  });
});

describe("readLock", () => {
  // ----- 正常系 -----
  it("代入行を tag → SHA の対応として読む", () => {
    writeRaw(`"actions/checkout@v7" = "${SHA}"\n`);

    expect(readLock(lockPath)).toEqual(new Map([["actions/checkout@v7", SHA]]));
  });

  it("コメント行と空行を読み飛ばす", () => {
    writeRaw(`# 見出し\n\n"actions/checkout@v7" = "${SHA}"\n`);

    expect(readLock(lockPath).size).toBe(1);
  });

  it("前後の空白を無視して読む", () => {
    writeRaw(`  "actions/checkout@v7" = "${SHA}"  \n`);

    expect(readLock(lockPath).size).toBe(1);
  });

  // ----- 異常系 -----
  it("代入形でない行を行番号付きで落とす", () => {
    writeRaw(`"actions/checkout@v7"\n`);

    expect(() => readLock(lockPath)).toThrow(/:1 形式が不正です/);
  });

  it("40 桁の 16 進でない SHA を落とす", () => {
    writeRaw(`"actions/checkout@v7" = "v7.0.0"\n`);

    expect(() => readLock(lockPath)).toThrow(/:1 SHA が 40 桁の 16 進ではありません: v7\.0\.0/);
  });

  it("キーの重複を落とす", () => {
    writeRaw(`"actions/checkout@v7" = "${SHA}"\n"actions/checkout@v7" = "${OTHER_SHA}"\n`);

    expect(() => readLock(lockPath)).toThrow(/:2 キーが重複しています: actions\/checkout@v7/);
  });

  it("ファイルが無ければ読み取り失敗を投げる", () => {
    expect(() => readLock(join(root, "不在.toml"))).toThrow();
  });
});

describe("readLockOrEmpty", () => {
  // ----- 正常系 -----
  it("読めるロックファイルはそのまま読む", () => {
    writeRaw(`"actions/checkout@v7" = "${SHA}"\n`);

    expect(readLockOrEmpty(lockPath).size).toBe(1);
  });

  // ----- 異常系 -----
  it("ファイル不在だけを空として扱う", () => {
    expect(readLockOrEmpty(join(root, "不在.toml"))).toEqual(new Map());
  });

  it("壊れた行は握り潰さずに投げる", () => {
    writeRaw("壊れた行\n");

    expect(() => readLockOrEmpty(lockPath)).toThrow(/形式が不正です/);
  });
});

describe("writeLock", () => {
  // ----- 正常系 -----
  it("見出しを添えてキー順に書き出す", () => {
    writeLock(
      lockPath,
      new Map([
        ["actions/checkout@v7", SHA],
        ["actions/cache@v6", OTHER_SHA],
      ]),
    );

    const lines = readFileSync(lockPath, "utf8").split("\n");

    expect(lines[0]?.startsWith("#")).toBe(true);
    expect(lines.slice(2, 4)).toEqual([
      `"actions/cache@v6" = "${OTHER_SHA}"`,
      `"actions/checkout@v7" = "${SHA}"`,
    ]);
  });

  it("書き出した内容を readLock で読み戻せる", () => {
    const lock = new Map([["actions/checkout@v7", SHA]]);
    writeLock(lockPath, lock);

    expect(readLock(lockPath)).toEqual(lock);
  });

  it("読み取り専用でない一般的な権限で書き出す", () => {
    writeLock(lockPath, new Map());

    expect(statSync(lockPath).mode & 0o777).toBe(0o644);
  });

  // ----- 異常系 -----
  it("空のロックでも見出しだけを書き出す", () => {
    writeLock(lockPath, new Map());

    expect(readLock(lockPath)).toEqual(new Map());
  });
});

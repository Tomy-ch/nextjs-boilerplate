import fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { acquireHandoffLock, LOCK_TTL_MS, lockRefusal, releaseHandoffLock } from "./lock";

const HELD_AT_SECONDS = 1_700_000_000;
const HELD_AT_MS = HELD_AT_SECONDS * 1000;

let workspace: string;
let lockPath: string;

/** 保持者を書いたリースを置き、mtime を `HELD_AT_MS` へ揃える。 */
function placeLock(holder: string | undefined): void {
  fs.mkdirSync(lockPath, { recursive: true });

  if (holder !== undefined) {
    fs.writeFileSync(join(lockPath, "started_by"), holder);
  }

  fs.utimesSync(lockPath, HELD_AT_SECONDS, HELD_AT_SECONDS);
}

/** リースに残っている保持者を読む。 */
function holderOf(): string {
  return fs.readFileSync(join(lockPath, "started_by"), "utf8");
}

/** `code` 付きのファイル操作の失敗を作る。 */
function errnoError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(code), { code });
}

beforeEach(() => {
  workspace = fs.mkdtempSync(join(tmpdir(), "sync-ai-lock-"));
  lockPath = join(workspace, "tmp", "skills", "sync-ai", ".handoff.lock");
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(workspace, { force: true, recursive: true });
});

describe("acquireHandoffLock", () => {
  // ----- 正常系 -----
  it("空いていれば親ディレクトリごと作って取り、保持者を書き残す", () => {
    expect(acquireHandoffLock(lockPath, "実行 A", Date.now())).toEqual({ acquired: true });
    expect(holderOf()).toBe("実行 A");
  });

  it("TTL を過ぎたリースは取り直し、保持者を差し替える", () => {
    placeLock("落ちた実行");

    expect(acquireHandoffLock(lockPath, "実行 B", HELD_AT_MS + LOCK_TTL_MS)).toEqual({
      acquired: true,
    });
    expect(holderOf()).toBe("実行 B");
  });

  it("作れなかった直後に保持者が手放していたら、取り直す", () => {
    const original = fs.mkdirSync;
    vi.spyOn(fs, "mkdirSync")
      .mockImplementationOnce(original)
      .mockImplementationOnce(() => {
        throw errnoError("EEXIST");
      });

    expect(acquireHandoffLock(lockPath, "実行 B", Date.now())).toEqual({ acquired: true });
    expect(holderOf()).toBe("実行 B");
  });

  // ----- 異常系 -----
  it("TTL 内のリースは取らず、保持者と経過時間を返す", () => {
    placeLock("実行 A");

    expect(acquireHandoffLock(lockPath, "実行 B", HELD_AT_MS + LOCK_TTL_MS - 1)).toEqual({
      acquired: false,
      heldBy: "実行 A",
      ageMs: LOCK_TTL_MS - 1,
    });
    expect(holderOf()).toBe("実行 A");
  });

  it("保持者をまだ書いていないリースは、保持者不明として取らない", () => {
    placeLock(undefined);

    expect(acquireHandoffLock(lockPath, "実行 B", HELD_AT_MS + 5000)).toEqual({
      acquired: false,
      heldBy: "unknown",
      ageMs: 5000,
    });
  });

  it("取り直しの間に別の実行が取ったら、取らずにその保持者を返す", () => {
    placeLock("落ちた実行");
    const original = fs.mkdirSync;
    vi.spyOn(fs, "mkdirSync")
      .mockImplementationOnce(original)
      .mockImplementationOnce(original)
      .mockImplementationOnce(() => {
        placeLock("実行 C");
        throw errnoError("EEXIST");
      });

    expect(acquireHandoffLock(lockPath, "実行 B", HELD_AT_MS + LOCK_TTL_MS)).toEqual({
      acquired: false,
      heldBy: "実行 C",
      ageMs: LOCK_TTL_MS,
    });
    expect(holderOf()).toBe("実行 C");
  });

  it("既に在る以外の理由で作れなければ、そのまま投げる", () => {
    const original = fs.mkdirSync;
    vi.spyOn(fs, "mkdirSync")
      .mockImplementationOnce(original)
      .mockImplementationOnce(() => {
        throw errnoError("EACCES");
      });

    expect(() => acquireHandoffLock(lockPath, "実行 A", Date.now())).toThrow("EACCES");
  });
});

describe("releaseHandoffLock", () => {
  // ----- 正常系 -----
  it("手放したリースは次の実行が取れる", () => {
    acquireHandoffLock(lockPath, "実行 A", Date.now());

    releaseHandoffLock(lockPath);

    expect(acquireHandoffLock(lockPath, "実行 B", Date.now())).toEqual({ acquired: true });
  });

  // ----- 異常系 -----
  it("在らないリースを手放しても投げない", () => {
    releaseHandoffLock(lockPath);

    expect(fs.existsSync(lockPath)).toBe(false);
  });
});

describe("lockRefusal", () => {
  // ----- 正常系 -----
  it("リースのパスと保持者と経過秒を示し、消し方を添える", () => {
    const message = lockRefusal("/repo/tmp/.handoff.lock", { heldBy: "実行 A", ageMs: 1999 });

    expect(message).toContain("保持者   : 実行 A（経過 1 秒）");
    expect(message).toContain("リース   : /repo/tmp/.handoff.lock");
    expect(message).toContain('rm -rf "/repo/tmp/.handoff.lock"');
    expect(message).toContain("実行しようとした follow-up は実行せず報告してください");
  });
});

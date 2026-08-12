import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({ execFile: execFileMock }));

import { earliestCreated, imageAgeDays, parseDigest, resolveDigest } from "./resolve";

const DIGEST = `sha256:${"a".repeat(64)}`;
const NOW = new Date("2026-08-13T00:00:00.000Z");

/** `execFile` の callback へ標準出力を返す。 */
function respondWith(stdout: string): void {
  execFileMock.mockImplementation(
    (_command: string, _args: string[], _options: unknown, callback: unknown) => {
      (callback as (e: null, r: { stdout: string; stderr: string }) => void)(null, {
        stdout,
        stderr: "",
      });
    },
  );
}

/** `execFile` の callback へ失敗を返す。 */
function failWith(error: unknown): void {
  execFileMock.mockImplementation(
    (_command: string, _args: string[], _options: unknown, callback: unknown) => {
      (callback as (e: unknown) => void)(error);
    },
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  execFileMock.mockReset();
});

describe("parseDigest", () => {
  // ----- 正常系 -----
  it("inspect 出力の Digest 行から digest を取り出す", () => {
    expect(parseDigest(`Name: alpine:3.24\nDigest:    ${DIGEST}\n`)).toBe(DIGEST);
  });

  // ----- 異常系 -----
  it("Digest 行が無ければ落とす", () => {
    expect(() => parseDigest("Name: alpine:3.24\n")).toThrow("Digest 行を解釈できません");
  });

  it("64 桁でない digest を Digest 行として認めない", () => {
    expect(() => parseDigest("Digest:    sha256:abc\n")).toThrow("Digest 行を解釈できません");
  });
});

describe("earliestCreated", () => {
  // ----- 正常系 -----
  it("単一アーキの config から作成時刻を読む", () => {
    expect(earliestCreated('{"created":"2026-07-27T10:05:21Z"}')).toEqual(
      new Date("2026-07-27T10:05:21Z"),
    );
  });

  it("マルチアーキでは最も古い作成時刻を採る", () => {
    const json = `{
      "linux/amd64": {"created":"2026-07-27T10:05:21Z"},
      "linux/arm64": {"created":"2026-07-20T09:00:00Z"}
    }`;

    expect(earliestCreated(json)).toEqual(new Date("2026-07-20T09:00:00Z"));
  });

  it("読めない作成時刻を持つ platform を飛ばす", () => {
    const json = `{
      "linux/amd64": {"created":"2026-07-27T10:05:21Z"},
      "unknown/arch": {}
    }`;

    expect(earliestCreated(json)).toEqual(new Date("2026-07-27T10:05:21Z"));
  });

  // ----- 異常系 -----
  it("どの platform からも作成時刻を読めなければ落とす", () => {
    expect(() => earliestCreated('{"linux/amd64":{}}')).toThrow(
      "image config の created を解釈できません",
    );
  });

  it("日付として読めない created を落とす", () => {
    expect(() => earliestCreated('{"created":"いつか"}')).toThrow(
      "image config の created を解釈できません",
    );
  });
});

describe("resolveDigest", () => {
  // ----- 正常系 -----
  it("registry へ問い合わせて digest を返す", async () => {
    respondWith(`Digest:    ${DIGEST}\n`);

    await expect(resolveDigest("alpine:3.24")).resolves.toBe(DIGEST);
    expect(execFileMock).toHaveBeenCalledWith(
      "docker",
      ["buildx", "imagetools", "inspect", "alpine:3.24"],
      expect.anything(),
      expect.anything(),
    );
  });

  // ----- 異常系 -----
  it("問い合わせの失敗に参照を添えて落とす", async () => {
    failWith(new Error("no such manifest"));

    await expect(resolveDigest("alpine:3.24")).rejects.toThrow(
      /docker buildx imagetools inspect alpine:3\.24: .*no such manifest/,
    );
  });

  it("Error でない失敗も文字列にして落とす", async () => {
    failWith("切断");

    await expect(resolveDigest("alpine:3.24")).rejects.toThrow(/alpine:3\.24: 切断/);
  });
});

describe("imageAgeDays", () => {
  // ----- 正常系 -----
  it("作成時刻からの経過日数を返す", async () => {
    respondWith('{"created":"2026-07-30T00:00:00Z"}');

    await expect(imageAgeDays("alpine:3.24")).resolves.toBe(14);
  });
});

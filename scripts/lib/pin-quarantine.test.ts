import { describe, expect, it, vi } from "vitest";

import { quarantine } from "./pin-quarantine";

const CANDIDATE = "9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0";
const EXISTING = "bf7454d06d71f1098171f2acdf0cd4708d7b5920";

describe("quarantine", () => {
  // ----- 正常系 -----
  it("検疫を行わない設定では経過日数を問い合わせずに採用する", async () => {
    const ageOf = vi.fn();

    await expect(quarantine(ageOf, "k", CANDIDATE, 0, new Map())).resolves.toEqual({
      use: CANDIDATE,
      note: null,
    });
    expect(ageOf).not.toHaveBeenCalled();
  });

  it("窓を満たす解決先を採用する", async () => {
    await expect(quarantine(async () => 14, "k", CANDIDATE, 14, new Map())).resolves.toEqual({
      use: CANDIDATE,
      note: null,
    });
  });

  // ----- 異常系 -----
  it("新しすぎる解決先では既存ピンを維持する", async () => {
    const existing = new Map([["k", EXISTING]]);

    await expect(quarantine(async () => 3, "k", CANDIDATE, 14, existing)).resolves.toEqual({
      use: EXISTING,
      note: "k: 解決先が 3 日 (<14) のため既存ピンを維持",
    });
  });

  it("新しすぎるうえ既存ピンも無ければ採用を見送る", async () => {
    await expect(quarantine(async () => 3, "k", CANDIDATE, 14, new Map())).resolves.toEqual({
      use: null,
      note: "k: 解決先が 3 日 (<14)・既存ピン無しのため skip",
    });
  });
});

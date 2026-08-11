import { describe, expect, it } from "vitest";

import { resolveBand } from "./band";

describe("resolveBand", () => {
  // ----- 正常系 -----
  it("使用率が 0.5 未満なら full にする", () => {
    expect(resolveBand({ worktrees: 1, cpus: 16, loadAverage: 4 })).toMatchObject({
      band: "full",
    });
  });

  it("使用率が 0.5 以上 1 未満なら low にする", () => {
    expect(resolveBand({ worktrees: 1, cpus: 16, loadAverage: 8 })).toMatchObject({
      band: "low",
    });
  });

  it("使用率が 1 以上なら ci-first にする", () => {
    expect(resolveBand({ worktrees: 1, cpus: 16, loadAverage: 16 })).toMatchObject({
      band: "ci-first",
    });
  });

  it("窓が多くてもホストが空いていれば full にする", () => {
    expect(resolveBand({ worktrees: 15, cpus: 16, loadAverage: 1 }).band).toBe("full");
  });

  it("窓が 1 つでもホストが飽和していれば ci-first にする", () => {
    expect(resolveBand({ worktrees: 1, cpus: 16, loadAverage: 32 }).band).toBe("ci-first");
  });

  it("CPU 配分は作業ツリーの数で決める", () => {
    expect(resolveBand({ worktrees: 4, cpus: 16, loadAverage: 1 }).cpuShare).toBe(4);
  });

  it("根拠に使用率・load・CPU 数・窓数をすべて載せる", () => {
    const reason = resolveBand({ worktrees: 15, cpus: 16, loadAverage: 31.58 }).reason;

    expect(reason).toContain("使用率 1.97");
    expect(reason).toContain("load 31.58 / CPU 16");
    expect(reason).toContain("作業ツリー 15 → 1 窓あたり 1");
  });

  it("full の根拠は手元で走らせることを述べる", () => {
    expect(resolveBand({ worktrees: 1, cpus: 16, loadAverage: 0 }).reason).toContain(
      "手元で全部走らせます",
    );
  });

  it("low の根拠は並列度を落とすことを述べる", () => {
    expect(resolveBand({ worktrees: 1, cpus: 16, loadAverage: 8 }).reason).toContain(
      "並列度を落として",
    );
  });

  it("ci-first の根拠は、失敗が変更に起因すると信じられないことを述べる", () => {
    expect(resolveBand({ worktrees: 1, cpus: 16, loadAverage: 32 }).reason).toContain(
      "信じられない",
    );
  });

  // ----- 異常系 -----
  it("窓数が 0 以下でも 1 窓として扱う", () => {
    expect(resolveBand({ worktrees: 0, cpus: 8, loadAverage: 0 }).cpuShare).toBe(8);
  });

  it("CPU 数が 0 以下でも 1 として扱い、CPU 配分を 1 未満にしない", () => {
    expect(resolveBand({ worktrees: 4, cpus: 0, loadAverage: 0 }).cpuShare).toBe(1);
  });

  it("load average が負値でも 0 として扱う", () => {
    expect(resolveBand({ worktrees: 1, cpus: 16, loadAverage: -1 }).band).toBe("full");
  });

  it("小数の窓数と CPU 数は切り捨てて扱う", () => {
    expect(resolveBand({ worktrees: 2.9, cpus: 16.9, loadAverage: 0 }).cpuShare).toBe(8);
  });
});

import { describe, expect, it } from "vitest";

import { codeBlock } from "./format";
import { failedShards, formatShardOutcomes, parseShardOutcome } from "./shard-outcome";

/** 台が書き出す綴りを組む。本番と同じ形で読ませるため、テスト側で手書きしない。 */
function statusFile(shard: string, exit: string, tail = "ログ"): string {
  return `shard=${shard}\nexit=${exit}\n--- tail ---\n${tail}\n`;
}

describe("parseShardOutcome", () => {
  // ----- 正常系 -----
  it("名乗り・終了コード・ログの末尾を読み分ける", () => {
    expect(parseShardOutcome(statusFile("3/4", "1", "落ちた理由"))).toEqual({
      shard: "3/4",
      exitCode: 1,
      tail: "落ちた理由",
    });
  });

  it("ログの末尾が複数行でも、区切りから後ろを丸ごと持つ", () => {
    expect(parseShardOutcome(statusFile("1/4", "0", "一行目\n二行目")).tail).toBe("一行目\n二行目");
  });

  // ----- 異常系 -----
  it("終了コードが数でなければ不明として残す（異常なしへ倒さない）", () => {
    expect(parseShardOutcome(statusFile("2/4", "")).exitCode).toBeNaN();
  });

  it("形が変わって名乗りが無くても、台が在ったことは残す", () => {
    const outcome = parseShardOutcome("まったく違う中身");

    expect(outcome.shard).toBe("(不明な台)");
    expect(outcome.exitCode).toBeNaN();
  });
});

describe("failedShards", () => {
  // ----- 正常系 -----
  it("終了コード 0 の台を落とし、名乗りの順に並べる", () => {
    const outcomes = ["3/4", "1/4", "2/4"].map((shard, index) =>
      parseShardOutcome(statusFile(shard, index === 1 ? "0" : "1")),
    );

    expect(failedShards(outcomes).map((outcome) => outcome.shard)).toEqual(["2/4", "3/4"]);
  });

  it("終了コードが不明な台は落ちた側に数える", () => {
    expect(failedShards([parseShardOutcome(statusFile("1/4", "x"))])).toHaveLength(1);
  });
});

describe("formatShardOutcomes", () => {
  // ----- 正常系 -----
  it("全台が 0 なら何も述べない", () => {
    const outcomes = ["1/4", "2/4"].map((shard) => parseShardOutcome(statusFile(shard, "0")));

    expect(formatShardOutcomes(outcomes, codeBlock)).toBe("");
  });

  it("落ちた台の名乗りと終了コードを、集計より先に述べる", () => {
    const body = formatShardOutcomes(
      [parseShardOutcome(statusFile("3/4", "1", "何も出なかった"))],
      codeBlock,
    );

    expect(body).toContain("**1 台が、テスト結果の外で落ちています。**");
    expect(body).toContain("### 台 3/4 —— 終了コード 1");
    expect(body).toContain("何も出なかった");
  });

  it("終了コードが不明でも台を伏せない", () => {
    const body = formatShardOutcomes([parseShardOutcome(statusFile("2/4", "x"))], codeBlock);

    expect(body).toContain("### 台 2/4 —— 終了コード 不明");
  });

  // ----- 異常系 -----
  it("その台のログが空でも、落ちた事実を述べる", () => {
    const body = formatShardOutcomes([parseShardOutcome(statusFile("1/4", "2", ""))], codeBlock);

    expect(body).toContain("### 台 1/4 —— 終了コード 2");
    expect(body).toContain("(その台のログが空でした)");
  });
});

import { describe, expect, it } from "vitest";

import { countUnparsable, parseLine, parseTranscript, withinWindow } from "./events";

function line(entry: unknown): string {
  return JSON.stringify(entry);
}

const AT = "2026-09-09T10:00:00.000Z";
const EPOCH = 1788948000;

describe("parseLine", () => {
  // ----- 正常系 -----
  it("人の発話を、本文つきで出す", () => {
    expect(
      parseLine(line({ type: "user", timestamp: AT, message: { content: "直して" } })),
    ).toEqual([{ at: EPOCH, kind: "prompt", text: "直して" }]);
  });

  it("text ブロックの連なりも本文として拾う", () => {
    const events = parseLine(
      line({
        type: "user",
        timestamp: AT,
        message: {
          content: [
            { type: "text", text: "前半" },
            { type: "text", text: "後半" },
          ],
        },
      }),
    );

    expect(events[0]).toEqual({ at: EPOCH, kind: "prompt", text: "前半\n後半" });
  });

  it("道具の呼び出しと、スキルの起動を出す", () => {
    const events = parseLine(
      line({
        type: "assistant",
        timestamp: AT,
        message: {
          content: [{ type: "tool_use", name: "Skill", input: { skill: "commit" } }],
        },
      }),
    );

    expect(events).toEqual([
      { at: EPOCH, kind: "assistant" },
      { at: EPOCH, kind: "tool_use", name: "Skill" },
      { at: EPOCH, kind: "command", name: "commit" },
    ]);
  });

  it("`/名前` の起動も同じ出来事にする", () => {
    const events = parseLine(
      line({
        type: "user",
        timestamp: AT,
        message: { content: "<command-name>/commit</command-name>" },
      }),
    );

    expect(events).toContainEqual({ at: EPOCH, kind: "command", name: "commit" });
  });

  it("道具の結果を、成否つきで出す", () => {
    const events = parseLine(
      line({
        type: "user",
        timestamp: AT,
        message: { content: [{ type: "tool_result", is_error: true }] },
      }),
    );

    expect(events).toContainEqual({ at: EPOCH, kind: "tool_result", ok: false });
  });

  it("中断を出す", () => {
    const events = parseLine(
      line({
        type: "user",
        timestamp: AT,
        message: { content: [{ type: "text", text: "[Request interrupted by user]" }] },
      }),
    );

    expect(events.some((event) => event.kind === "interrupt")).toBe(true);
  });

  it.each([
    "Base directory for this skill: /repo/.claude/skills/commit",
    "Another Claude session sent a message: 違う",
  ])("isMeta の付いた行 %s は、人の発話として出さない", (text) => {
    expect(
      parseLine(line({ type: "user", timestamp: AT, isMeta: true, message: { content: text } })),
    ).toEqual([]);
  });

  it("isMeta が true でなければ、人の発話として出す", () => {
    expect(
      parseLine(
        line({ type: "user", timestamp: AT, isMeta: false, message: { content: "直して" } }),
      ),
    ).toEqual([{ at: EPOCH, kind: "prompt", text: "直して" }]);
  });

  it.each([
    { origin: { kind: "human" } },
    { promptSource: "typed" },
    { promptSource: "suggestion_accepted" },
    { promptSource: "queued" },
  ])("出所を人と示す行 %o は、人の発話として出す", (keys) => {
    expect(
      parseLine(line({ type: "user", timestamp: AT, ...keys, message: { content: "直して" } })),
    ).toEqual([{ at: EPOCH, kind: "prompt", text: "直して" }]);
  });

  it.each([
    { origin: { kind: "peer" } },
    { origin: { kind: "task-notification" } },
    { promptSource: "system" },
  ])("出所を人以外と示す行 %o は、isMeta が無くても人の発話として出さない", (keys) => {
    expect(
      parseLine(line({ type: "user", timestamp: AT, ...keys, message: { content: "違う" } })),
    ).toEqual([]);
  });

  it.each([
    { origin: { kind: "human" }, isMeta: true },
    { promptSource: "typed", isCompactSummary: true },
  ])("出所を人と示す鍵 %o は、isMeta や isCompactSummary より優先する", (keys) => {
    expect(
      parseLine(line({ type: "user", timestamp: AT, ...keys, message: { content: "直して" } })),
    ).toEqual([{ at: EPOCH, kind: "prompt", text: "直して" }]);
  });

  it.each([
    { origin: null, promptSource: "typed" },
    { origin: {}, promptSource: "typed" },
    { origin: { kind: 5 }, promptSource: "typed" },
  ])("origin.kind が文字列でない行 %o は、promptSource で決める", (keys) => {
    expect(
      parseLine(line({ type: "user", timestamp: AT, ...keys, message: { content: "直して" } })),
    ).toEqual([{ at: EPOCH, kind: "prompt", text: "直して" }]);
  });

  it.each([
    { origin: null, isMeta: true },
    { origin: { kind: 5 }, isMeta: true },
    { promptSource: 1, isMeta: true },
  ])("出所の鍵が文字列でない行 %o は、isMeta で決める", (keys) => {
    expect(
      parseLine(line({ type: "user", timestamp: AT, ...keys, message: { content: "違う" } })),
    ).toEqual([]);
  });

  it("origin.kind が人を示せば、promptSource より優先する", () => {
    expect(
      parseLine(
        line({
          type: "user",
          timestamp: AT,
          origin: { kind: "human" },
          promptSource: "system",
          message: { content: "直して" },
        }),
      ),
    ).toEqual([{ at: EPOCH, kind: "prompt", text: "直して" }]);
  });

  it("origin が物でなければ、promptSource で決める", () => {
    expect(
      parseLine(
        line({
          type: "user",
          timestamp: AT,
          origin: "human",
          promptSource: "system",
          message: { content: "直して" },
        }),
      ),
    ).toEqual([]);
  });

  it("文脈圧縮の要約は、目印の文面を含まなくても isCompactSummary で人の発話として出さない", () => {
    expect(
      parseLine(
        line({
          type: "user",
          timestamp: AT,
          isCompactSummary: true,
          message: { content: "要約の本文。違う" },
        }),
      ),
    ).toEqual([]);
  });

  it("文脈圧縮の要約は、人の発話として出さない", () => {
    expect(
      parseLine(
        line({
          type: "user",
          timestamp: AT,
          isCompactSummary: true,
          message: { content: "This session is being continued from a previous conversation" },
        }),
      ),
    ).toEqual([]);
  });

  it("道具の結果だけの行は、道具の結果だけを出す", () => {
    expect(
      parseLine(
        line({
          type: "user",
          timestamp: AT,
          message: { content: [{ type: "tool_result", is_error: false }] },
        }),
      ),
    ).toEqual([{ at: EPOCH, kind: "tool_result", ok: true }]);
  });

  it("中断の行は、中断だけを出す", () => {
    expect(
      parseLine(
        line({
          type: "user",
          timestamp: AT,
          message: { content: [{ type: "text", text: "[Request interrupted by user]" }] },
        }),
      ),
    ).toEqual([{ at: EPOCH, kind: "interrupt", text: "[Request interrupted by user]" }]);
  });

  it.each([
    "<task-notification>違う</task-notification>",
    "<local-command-caveat>違う</local-command-caveat>",
    "<system-reminder>違う</system-reminder>",
    "This session is being continued from a previous conversation. 違う",
  ])("差し込まれた本文 %s は、人の発話として出さない", (text) => {
    expect(parseLine(line({ type: "user", timestamp: AT, message: { content: text } }))).toEqual(
      [],
    );
  });

  it("`/名前` の起動は、起動だけを出す", () => {
    expect(
      parseLine(
        line({
          type: "user",
          timestamp: AT,
          message: { content: "<command-name>/commit</command-name>" },
        }),
      ),
    ).toEqual([{ at: EPOCH, kind: "command", name: "commit" }]);
  });

  // ----- 異常系 -----
  it("壊れた行と空行を空にする", () => {
    expect(parseLine("{")).toEqual([]);
    expect(parseLine("  ")).toEqual([]);
    expect(parseLine(line(null))).toEqual([]);
    expect(parseLine(line("文字列"))).toEqual([]);
  });

  it("時刻が読めなければ 0 にする", () => {
    expect(parseLine(line({ type: "user", timestamp: 42, message: { content: "x" } }))[0]?.at).toBe(
      0,
    );
    expect(parseLine(line({ type: "assistant", timestamp: "時刻ではない" }))[0]?.at).toBe(0);
  });

  it("知らない形の中身を飛ばす", () => {
    const events = parseLine(
      line({ type: "assistant", timestamp: AT, message: { content: [null, { type: "未知" }] } }),
    );

    expect(events).toEqual([{ at: EPOCH, kind: "assistant" }]);
  });

  it("知らない promptSource の行は、人の発話として出さない", () => {
    expect(
      parseLine(
        line({
          type: "user",
          timestamp: AT,
          promptSource: "未知の値",
          message: { content: "違う" },
        }),
      ),
    ).toEqual([]);
  });

  it.each(["<system-reminder>違う</system-reminder>", "[Request interrupted by user]", ""])(
    "出所が人の行でも、本文 %j は人の発話として出さない",
    (text) => {
      expect(
        parseLine(
          line({
            type: "user",
            timestamp: AT,
            origin: { kind: "human" },
            promptSource: "typed",
            message: { content: text },
          }),
        ).filter((event) => event.kind === "prompt"),
      ).toEqual([]);
    },
  );

  it("text ブロックの 1 つが目印を含めば、行全体を人の発話として出さない", () => {
    expect(
      parseLine(
        line({
          type: "user",
          timestamp: AT,
          message: {
            content: [
              { type: "text", text: "違う" },
              { type: "text", text: "<system-reminder>注記</system-reminder>" },
            ],
          },
        }),
      ),
    ).toEqual([]);
  });

  it("本文を持たない発話は、人の発話として出さない", () => {
    expect(parseLine(line({ type: "user", timestamp: AT, message: { content: 42 } }))).toEqual([]);
  });

  it("Skill の起動を、道具の呼び出しと起動の両方として出す", () => {
    expect(
      parseLine(
        line({
          type: "assistant",
          timestamp: AT,
          message: { content: [{ type: "tool_use", name: "Skill", input: { skill: "commit" } }] },
        }),
      ),
    ).toEqual([
      { at: EPOCH, kind: "assistant" },
      { at: EPOCH, kind: "tool_use", name: "Skill" },
      { at: EPOCH, kind: "command", name: "commit" },
    ]);
  });

  it("message が物でない行は、本文が無いものとして読む", () => {
    expect(parseLine(line({ type: "user", timestamp: AT, message: "文字列" }))).toEqual([]);
  });

  it("Skill の入力が読めなければ、起動としては数えない", () => {
    expect(
      parseLine(
        line({
          type: "assistant",
          timestamp: AT,
          message: { content: [{ type: "tool_use", name: "Skill", input: "文字列" }] },
        }),
      ),
    ).toEqual([
      { at: EPOCH, kind: "assistant" },
      { at: EPOCH, kind: "tool_use", name: "Skill" },
    ]);
  });

  it("Skill 以外の道具は、起動として数えない", () => {
    expect(
      parseLine(
        line({
          type: "assistant",
          timestamp: AT,
          message: { content: [{ type: "tool_use", name: "Read", input: { skill: "commit" } }] },
        }),
      ),
    ).toEqual([
      { at: EPOCH, kind: "assistant" },
      { at: EPOCH, kind: "tool_use", name: "Read" },
    ]);
  });
});

describe("parseTranscript", () => {
  // ----- 正常系 -----
  it("全行の出来事を繋げる", () => {
    const events = parseTranscript([
      line({ type: "user", timestamp: AT, message: { content: "a" } }),
      line({ type: "assistant", timestamp: AT }),
    ]);

    expect(events.map((event) => event.kind)).toEqual(["prompt", "assistant"]);
  });

  // ----- 異常系 -----
  it("壊れた行があっても、残りを読む", () => {
    expect(parseTranscript(["{", line({ type: "assistant", timestamp: AT })])).toHaveLength(1);
  });
});

describe("countUnparsable", () => {
  // ----- 正常系 -----
  it("解釈できた行と空行は数えない", () => {
    expect(countUnparsable([line({ type: "user" }), "", "  "])).toBe(0);
  });

  // ----- 異常系 -----
  it("解釈できなかった行を数える", () => {
    expect(countUnparsable(["{", "not json", line({ type: "user" })])).toBe(2);
  });
});

describe("withinWindow", () => {
  const events = [
    { at: 50, kind: "prompt" as const },
    { at: 100, kind: "prompt" as const },
    { at: 200, kind: "prompt" as const },
    { at: 300, kind: "prompt" as const },
  ];

  // ----- 正常系 -----
  it("窓の両端を含めて取り出す", () => {
    expect(withinWindow(events, 100, 200).map((event) => event.at)).toEqual([100, 200]);
  });

  it("閉じていない窓は、開いた後をすべて取る", () => {
    expect(withinWindow(events, 100, null).map((event) => event.at)).toEqual([100, 200, 300]);
  });

  // ----- 異常系 -----
  it("時刻を持たない出来事を入れない", () => {
    expect(withinWindow([{ at: 0, kind: "prompt" }], 0, null)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import type { Change } from "../lib/numstat";
import { decideNudge, renderNudge } from "./nudge";

/** 変更 1 件。 */
function change(path: string, changedLines = 1): Change {
  return { path, changedLines };
}

/** 本文の最後の段落。 */
function lastBlockOf(body: string | undefined): string | undefined {
  return body?.trimEnd().split("\n\n").at(-1);
}

/** 表のうち、そのラベルの行 1 本。 */
function rowFor(body: string | undefined, label: string): string | undefined {
  return body?.split("\n").find((line) => line.startsWith(`| \`${label}\``));
}

/** どちらのコメントも最後に置く断り。 */
const NOT_A_GATE = [
  "**これはゲートではありません。** どれも付けずに merge できます。全数は保護ブランチへの",
  "merge と日次で回り（ADR 0091 §3）、`develop` / `staging` / `production` を base とする PR",
  "では 3 つとも必ず回ります。",
].join("\n");

describe("decideNudge", () => {
  // ----- 正常系 -----
  it("構造から名指しできたら、行数を見ずに名指しを返す", () => {
    const nudge = decideNudge([change("src/proxy.ts", 1)], [], 400);

    expect(nudge.kind).toBe("recommend");
    expect(nudge.kind === "recommend" && nudge.checks.map((check) => check.label)).toStrictEqual([
      "run-e2e",
    ]);
  });

  it("名指しできず行数が線を越えたら、まだ付いていないラベルを並べる", () => {
    const nudge = decideNudge([change("src/features/settings/total.ts", 500)], ["run-e2e"], 400);

    expect(nudge).toStrictEqual({
      kind: "volume",
      changedLines: 500,
      checks: [
        { label: "run-a11y", runs: "全 story への axe", duration: "約 10 分" },
        { label: "run-lighthouse", runs: "全画面の Core Web Vitals", duration: "約 16 分" },
      ],
    });
  });

  it("線のちょうど上は越えたものとして扱う", () => {
    expect(decideNudge([change("src/features/settings/total.ts", 400)], [], 400).kind).toBe(
      "volume",
    );
  });

  // ----- 異常系 -----
  it("名指しできず行数も線に届かなければ黙る", () => {
    expect(decideNudge([change("src/features/settings/total.ts", 399)], [], 400).kind).toBe(
      "quiet",
    );
  });

  it("数える対象の外だけが動いた差分では黙る", () => {
    expect(decideNudge([change("docs/adr/BACKLOG.md", 5000)], [], 400).kind).toBe("quiet");
  });

  it("3 つとも既に付いていれば、行数が越えていても黙る", () => {
    expect(
      decideNudge(
        [change("src/features/settings/total.ts", 5000)],
        ["run-a11y", "run-e2e", "run-lighthouse"],
        400,
      ).kind,
    ).toBe("quiet");
  });
});

describe("renderNudge", () => {
  // ----- 正常系 -----
  it("名指しの表に、ラベルと回るものと目安と理由を並べる", () => {
    const comment = renderNudge(decideNudge([change("src/app/fonts.ts")], [], 400));

    expect(comment?.title).toBe("## 🔎 この PR で回しておくことを勧める検査");
    expect(comment?.body).toContain(
      "| `run-lighthouse` | 全画面の Core Web Vitals | 約 16 分 | 全ての画面が同じ書体を読みます。書体の取得は LCP に直に効きます |",
    );
  });

  it("理由が複数あれば 1 つの升目に区切って並べる", () => {
    const comment = renderNudge(
      decideNudge([change("src/proxy.ts"), change("mocks/handlers.ts")], [], 400),
    );

    expect(comment?.body).toContain(
      "全てのリクエストが通る proxy が動いています / mock の応答が動いています。CI ではこれがそのまま画面の中身になります |",
    );
  });

  it("行数の表には理由の列を置かず、動いた行数を本文に書く", () => {
    const comment = renderNudge(
      decideNudge([change("src/features/settings/total.ts", 512)], [], 400),
    );

    expect(comment?.title).toBe("## 🔎 先送りにしている検査を回しておくことを勧めます");
    expect(comment?.body).toContain("**512 行**");
    expect(rowFor(comment?.body, "run-a11y")).toBe("| `run-a11y` | 全 story への axe | 約 10 分 |");
  });

  it("名指しの表は、ゲートではないという断りで終わる", () => {
    expect(lastBlockOf(renderNudge(decideNudge([change("src/proxy.ts")], [], 400))?.body)).toBe(
      NOT_A_GATE,
    );
  });

  it("行数の表も、ゲートではないという断りで終わる", () => {
    expect(
      lastBlockOf(renderNudge(decideNudge([change("src/app/globals.css", 900)], [], 400))?.body),
    ).toBe(NOT_A_GATE);
  });

  // ----- 異常系 -----
  it("言うことがなければ何も組まない", () => {
    expect(renderNudge({ kind: "quiet" })).toBeUndefined();
  });
});

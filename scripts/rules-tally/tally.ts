/**
 * [実装規約](../../docs/rules.md)を読んで、[トレーサビリティ](../../docs/traceability.md)へ載せる
 * 集計を組む。
 *
 * @remarks
 * 集計を手で書かない判断と、判定の綴りを 3 語へ閉じる判断は、[scripts](../README.md)「関連する ADR」
 * が持ちます。
 *
 * ここが機械で数えられるのは綴りが閉じているからで、閉じていない綴りは数えずに
 * {@link RuleTally.violations} へ載せます —— 読み飛ばすと、取りこぼした分だけ件数が小さく出て、
 * 集計が「守られている」向きに倒れます。
 */

/** 判定の綴り。この 3 語の外は数えない。 */
const VERDICTS = ["寄せられない", "一部寄せられる", "寄せられる"] as const;

type Verdict = (typeof VERDICTS)[number];

/** 節の見出し。 */
const HEADING = /^## (.+)$/;

/** 見出しの直前に置く錨。 */
const ANCHOR = /^<a id="([^"]+)"><\/a>$/;

/** 節頭の根拠。`enforced via` を持つものだけが「その節を機械が見ている」と述べている。 */
const RATIONALE = /^> Rationale:.*enforced via/;

/** 規約の箇条書き。要旨は最初の強調に入っている。 */
const RULE = /^- \*\*(.+?)\*\*/;

/** 規約が自分で述べる判定。 */
const VERDICT = /散文 —— \*\*([^*]+)\*\*/g;

/** 集計の埋め込み先を挟む印。 */
const BLOCK = /<!-- generated: rules-tally -->[\s\S]*?<!-- \/generated: rules-tally -->/;

/** 判定を自分で述べた規約 1 件。 */
export interface JudgedRule {
  /** 属する節の錨。指す側はこれを使う。 */
  readonly anchor: string;
  /** 属する節の見出し。 */
  readonly section: string;
  /** 規約の要旨（箇条書きの最初の強調）。**識別子ではない** —— 言い換えれば変わる。 */
  readonly summary: string;
  /** 3 語のどれを述べたか。 */
  readonly verdict: Verdict;
}

/** `rules.md` から数えた結果。 */
export interface RuleTally {
  /** 節の数。 */
  readonly sections: number;
  /** 節頭で機械の手段を名乗った節の数。 */
  readonly enforcedSections: number;
  /** 規約の数。 */
  readonly rules: number;
  /** 判定を自分で述べた規約。 */
  readonly judged: readonly JudgedRule[];
  /** 数えられなかったもの。1 件でも在れば集計は成り立たない。 */
  readonly violations: readonly string[];
}

/** 読んでいる途中の規約 1 件。判定は本文のどこにでも書けるので、次の規約まで溜める。 */
interface Pending {
  readonly anchor: string;
  readonly section: string;
  readonly summary: string;
  readonly lines: string[];
}

/**
 * 実装規約を数える。
 *
 * @param markdown - `docs/rules.md` の中身。
 * @returns 節と規約の数、判定を述べた規約、そして数えられなかったものの一覧。
 */
export function collectRuleTally(markdown: string): RuleTally {
  const violations: string[] = [];
  const judged: JudgedRule[] = [];
  const anchors = new Set<string>();

  let anchor: string | null = null;
  let section: { anchor: string; title: string } | null = null;
  let pending: Pending | null = null;
  let enforcedSections = 0;
  let sections = 0;
  let rules = 0;

  /** 読み終えた規約 1 件を判定へ落とす。次の規約と節の切れ目、そして文書の末尾で呼ぶ。 */
  const settle = (): void => {
    if (pending === null) return;

    for (const [, spelling] of pending.lines.join("\n").matchAll(VERDICT)) {
      const verdict = VERDICTS.find((known) => known === spelling);

      if (verdict === undefined) {
        violations.push(`判定の綴りが 3 語の外: 「${spelling}」（${pending.summary}）`);
        continue;
      }

      judged.push({
        anchor: pending.anchor,
        section: pending.section,
        summary: pending.summary,
        verdict,
      });
    }

    pending = null;
  };

  for (const line of markdown.split("\n")) {
    const found = ANCHOR.exec(line)?.[1];

    if (found !== undefined) {
      anchor = found;
      continue;
    }

    const title = HEADING.exec(line)?.[1];

    if (title !== undefined) {
      settle();
      sections += 1;

      if (anchor === null) violations.push(`節が錨を持たない: 「${title}」`);
      else if (anchors.has(anchor)) violations.push(`錨が重複している: 「${anchor}」`);
      else anchors.add(anchor);

      section = { anchor: anchor ?? "", title };
      anchor = null;
      continue;
    }

    if (section === null) continue;

    if (RATIONALE.test(line)) {
      enforcedSections += 1;
      continue;
    }

    const lead = RULE.exec(line)?.[1];

    if (lead !== undefined) {
      settle();
      rules += 1;
      pending = { anchor: section.anchor, lines: [], section: section.title, summary: lead };
    }

    pending?.lines.push(line);
  }

  settle();

  return { enforcedSections, judged, rules, sections, violations };
}

/**
 * 集計を、トレーサビリティへ貼る Markdown へ組む。
 *
 * @param tally - {@link collectRuleTally} が数えた結果。
 * @returns 印を含む生成ブロック。
 * @throws 数えられなかったものが在るとき。取りこぼしたまま件数だけ出すと、集計が小さく出る。
 */
export function renderRuleTally(tally: RuleTally): string {
  if (tally.violations.length > 0) {
    throw new Error(`実装規約を数えられません:\n- ${tally.violations.join("\n- ")}`);
  }

  const counts = VERDICTS.map(
    (verdict) => `| ${verdict} | ${tally.judged.filter((r) => r.verdict === verdict).length} |`,
  );
  const pending = tally.judged.filter((rule) => rule.verdict !== "寄せられない");
  const rows = pending.map(
    (rule) => `| [${rule.section}](rules.md#${rule.anchor}) | ${rule.summary} | ${rule.verdict} |`,
  );

  return [
    "<!-- generated: rules-tally -->",
    "",
    `**節が ${tally.sections}、規約が ${tally.rules} 件。**`,
    `うち ${tally.enforcedSections} 節が節頭で機械の手段を名乗り、` +
      `${tally.judged.length} 件の規約が自分で判定を述べる。`,
    "",
    "| 判定 | 件数 |",
    "| --- | --- |",
    ...counts,
    "",
    `### 仕事が残っている ${pending.length} 件`,
    "",
    "| 節 | 規約 | 判定 |",
    "| --- | --- | --- |",
    ...rows,
    "",
    "<!-- /generated: rules-tally -->",
  ].join("\n");
}

/**
 * 生成ブロックを差し替える。
 *
 * @param document - 貼り付け先の中身。
 * @param block - {@link renderRuleTally} が組んだブロック。
 * @returns 差し替えた中身。
 * @throws 貼り付け先が印を持たないとき。黙って何もしないと、生成したつもりで古い本文が残る。
 */
export function replaceGeneratedBlock(document: string, block: string): string {
  if (!BLOCK.test(document)) throw new Error("貼り付け先が rules-tally の印を持ちません。");

  return document.replace(BLOCK, block);
}

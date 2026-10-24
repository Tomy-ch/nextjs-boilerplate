import { type Advisory, isBlocking, isSuppressed } from "./advisories";

/**
 * 検出を PR コメントの本文へ畳む。
 *
 * @remarks
 * 落ちた人が最初に知りたいのは「どれが止めているか」なので、blocking を先に並べます。止めない
 * ものを同じ表に残すのは、「抑止ファイルが空 = 何も除外されていない、ではない」と同じ理由です
 * —— 落とさないことと見せないことを分けます。
 */

/** 依存経路は先頭のいくつかだけを出す。全部並べても読む人が得るものが無い。 */
const MAX_PATHS = 3;

/** 経路を 1 セルへ畳む。 */
function pathCell(paths: readonly string[]): string {
  if (paths.length === 0) {
    return "—";
  }

  const shown = paths.slice(0, MAX_PATHS).map((path) => `\`${path}\``);
  const rest = paths.length - shown.length;

  return rest > 0 ? `${shown.join(", ")} ほか ${rest} 件` : shown.join(", ");
}

function row(advisory: Advisory): string {
  const fix = advisory.patched === undefined ? "**修正版なし**" : `\`${advisory.patched}\``;

  return `| ${advisory.severity} | \`${advisory.module}\` | ${fix} | [${advisory.title}](${advisory.url}) | ${pathCell(advisory.paths)} |`;
}

function table(advisories: readonly Advisory[]): string[] {
  return [
    "| severity | パッケージ | 修正版 | 内容 | 経路 |",
    "| --- | --- | --- | --- | --- |",
    ...advisories.map(row),
  ];
}

/**
 * 表を組み立てる。
 *
 * @param advisories - 検出。
 * @param suppressed - いま効いている抑止の ID。抑止したものは止めないが、別の表に残す。
 * @returns Markdown の本文。
 */
export function renderReport(
  advisories: readonly Advisory[],
  suppressed: ReadonlySet<string>,
): string {
  if (advisories.length === 0) {
    return "検出はありません。";
  }

  const blocking = advisories.filter((advisory) => isBlocking(advisory, suppressed));
  const held = advisories.filter((advisory) => isSuppressed(advisory, suppressed));
  const rest = advisories.filter(
    (advisory) => !isBlocking(advisory, suppressed) && !isSuppressed(advisory, suppressed),
  );
  const lines: string[] = [];

  if (blocking.length > 0) {
    lines.push(`### 止めているもの（${blocking.length} 件）`, "", ...table(blocking), "");
  }

  if (held.length > 0) {
    lines.push(
      `### 抑止しているもの（${held.length} 件）`,
      "",
      "`osv-scanner.toml` に理由と期限を書いて許容しているもの。",
      "",
      ...table(held),
      "",
    );
  }

  if (rest.length > 0) {
    lines.push(
      `### 止めないもの（${rest.length} 件）`,
      "",
      "severity が high 未満か、修正版がまだ無いもの。",
      "",
      ...table(rest),
      "",
    );
  }

  return lines.join("\n").trimEnd();
}

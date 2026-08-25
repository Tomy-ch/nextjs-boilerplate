import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";

/** 解決しなかったリンク 1 件。 */
export type BrokenLink = {
  /** リポジトリ相対のファイルパス。 */
  readonly file: string;
  /** そのファイルの中での行番号（1 始まり）。 */
  readonly line: number;
  /** 書かれていた相対リンク（アンカーを含む）。 */
  readonly href: string;
  /** 何が解決しなかったか。`path` はファイル、`anchor` は指し先の見出し。 */
  readonly reason: "anchor" | "path";
};

/**
 * 相対リンク 1 本。
 *
 * @remarks
 * `](path)` と `](<path>)` の両方を拾います。`<>` 囲みは `docs/spec/**` が `[id]` を含むパスに
 * 使っているので、落とすとその一群が丸ごと無検査になります。題名付き（`](path "title")`）は
 * 空白で切れるため、パスだけが残ります。
 */
const LINK = /\]\(\s*<?([^)<>\s]+)>?[^)]*\)/g;

/** 相対リンクではないもの。URL・プロトコル相対・ルート絶対を外す。 */
const NOT_RELATIVE = /^([a-z][a-z0-9+.-]*:|\/)/i;

/** コードフェンスの開閉。 */
const FENCE = /^\s*(```|~~~)/;

/** 行頭がコメントである行（TSDoc の継続行と行コメント）。 */
const COMMENT_LINE = /^\s*(\*|\/\/|\/\*)/;

/** ATX 見出し。 */
const HEADING = /^(#{1,6})\s+(.+)$/;

/**
 * リンクを探す対象の行だけを残す。行番号を保つため、外した行は空文字にして詰めない。
 *
 * @remarks
 * どちらもコードスパンを外します。外さないと、書き方そのものを示した例（バッククォートで
 * 囲んだリンクの形）を実在するリンクとして数えてしまいます。Markdown はコードフェンスも外します。
 *
 * ソースはコメント行だけを見ます。文字列リテラルの中のリンクは、そのファイルからの相対ではなく
 * 生成先からの相対なので、同じ規則で解決すると誤って落ちます。
 */
function scannableLines(file: string, content: string): string[] {
  const lines = content.split("\n");
  const withoutSpans = (line: string): string => line.replace(/`[^`]*`/g, "");

  if (extname(file) !== ".md") {
    return lines.map((line) => (COMMENT_LINE.test(line) ? withoutSpans(line) : ""));
  }

  let inFence = false;

  return lines.map((line) => {
    if (FENCE.test(line)) {
      inFence = !inFence;

      return "";
    }

    return inFence ? "" : withoutSpans(line);
  });
}

/**
 * 見出しを GitHub と同じ規則でアンカーへ変換する。
 *
 * @remarks
 * 小文字化し、英数字・空白・ハイフン・アンダースコア以外を落とし、空白をハイフンにします。
 * 日本語の見出しはそのまま残るため、`#storybook-の表示規約` のような形になります。
 */
function toAnchor(heading: string): string {
  return heading
    .trim()
    .replace(/<[^>]*>/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M} _-]/gu, "")
    .replace(/ /g, "-");
}

/**
 * Markdown が持つアンカーを集める。
 *
 * @remarks
 * 同じ見出しが 2 度目以降に現れたときは `-1` / `-2` が付きます。GitHub の採番に合わせています。
 */
function collectAnchors(markdown: string): Set<string> {
  const anchors = new Set<string>();
  const seen = new Map<string, number>();
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }

    const heading = inFence ? null : HEADING.exec(line);

    if (!heading) continue;

    const base = toAnchor(heading[2]);
    const count = seen.get(base) ?? 0;

    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  return anchors;
}

/** 指し先の Markdown がそのアンカーを持つか。 */
function hasAnchor(target: string, fragment: string): boolean {
  return collectAnchors(readFileSync(target, "utf8")).has(
    decodeURIComponent(fragment).toLowerCase(),
  );
}

/**
 * Markdown とソースの中から、解決しない相対リンクを拾う。
 *
 * @remarks
 * **段数を手で書く相対パスは、ファイルを動かした時点で静かに切れます。**型検査も lint も
 * 文字列の中までは見ないため、壊れても何も落ちません。読む人が辿って初めて気づく形になります。
 *
 * 指し先が Markdown なら、`#見出し` まで見ます。節の名前を変えたときに、それを指していた側が
 * どこにも現れないのは、パスが切れているのと同じことだからです。
 *
 * @param file - リポジトリ相対のファイルパス
 * @param content - そのファイルの中身
 * @param root - 相対パスを解決する起点（リポジトリルート）
 */
export function findBrokenDocLinks(file: string, content: string, root: string): BrokenLink[] {
  const broken: BrokenLink[] = [];

  scannableLines(file, content).forEach((text, index) => {
    for (const match of text.matchAll(LINK)) {
      const href = match[1];

      if (NOT_RELATIVE.test(href)) continue;

      const [path, fragment] = href.split("#");
      const target = path === "" ? resolve(root, file) : resolve(root, dirname(file), path);
      const line = index + 1;

      if (!existsSync(target)) {
        broken.push({ file, href, line, reason: "path" });
        continue;
      }

      if (!fragment) continue;
      if (statSync(target).isDirectory() || extname(target) !== ".md") continue;
      if (!hasAnchor(target, fragment)) broken.push({ file, href, line, reason: "anchor" });
    }
  });

  return broken;
}

/** 見つかったものを、そのまま直せる形の文言にする。 */
export function formatBrokenDocLinks(broken: readonly BrokenLink[], root: string): string {
  return broken
    .map(
      ({ file, line, href, reason }) =>
        `${relative(root, resolve(root, file))}:${line}: ${href}（${
          reason === "path" ? "ファイルが無い" : "見出しが無い"
        }）`,
    )
    .join("\n");
}

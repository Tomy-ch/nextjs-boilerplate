// `uses:` 行の走査と解釈。固定対象ファイルの列挙と、行から参照 1 件を取り出す責務を持つ。
import fs from "node:fs";
import path from "node:path";
import {
  COMPOSITE_ACTION_DIR,
  collectActionDefinitions,
  readDirOrEmpty,
} from "../lib/composite-action-files.js";

// GitHub Actions の参照 1 件。repo は owner/repo、sub は `codeql-action/init` のようなサブパス、
// tag は固定対象の版。
export type ActionRef = {
  repo: string;
  sub: string;
  tag: string;
};

// uses: [-] owner/repo[/sub]@<ref> [# <tag>] に一致する走査用パターン。
//
// 空白を `[ \t]` に限定するのは、`\s` だと改行を食って複数行が 1 マッチに結合するため。
// 引用符を値から締め出すのは、含めると `uses: "owner/repo@v1"` が引用符ごと一致し、
// `"owner` を owner として取り込んで固定対象に載せてしまうため。締め出せば一致しなくなり、
// unparsedUsesLines が対応記法の外として拾う。
//
// 単一のインスタンスを共有せず呼び出しごとに作るのは、`g` 付きの RegExp が `lastIndex` を
// 持ち回るため。`matchAll` はその時点の `lastIndex` からの走査になるので、共有インスタンスに
// 対して誰かが `test` / `exec` を呼んだ瞬間から、collectRefs がファイル先頭付近の `uses:` を
// 黙って読み飛ばす——固定の網から参照が外れる向きに、間欠的に壊れる。
export function usesPattern(): RegExp {
  return /^([ \t]*(?:-[ \t]*)?uses:[ \t]*)([^@\s'"]+)@([^\s#'"]+)(?:[ \t]*#[ \t]*(\S+))?[ \t]*$/gm;
}

// 記法を問わず `uses:` とその値を拾う。usesPattern の取りこぼし検出にのみ使う。
const LOOSE_USES_PATTERN = /\buses[ \t]*:[ \t]*['"]?([^\s'",}#]+)/;

// `uses:` キーそのもの。値を取れなかった行でも、キーが残っていることを見るために使う。
const USES_KEY_PATTERN = /\buses[ \t]*:/;

// 固定対象になりうる値の形。owner/repo で始まるものだけを通す。
const REPO_VALUE_PATTERN = /^[^/\s]+\/[^/\s]+/;

const WORKFLOW_DIR = ".github/workflows";
const YAML_EXTENSIONS = [".yml", ".yaml"];
const REPO_SEGMENTS = 2;

export function refKey(ref: ActionRef): string {
  return `${ref.repo}@${ref.tag}`;
}

// `uses:` に書き戻すパス。サブパスを持つアクションは owner/repo/sub の形に復元する。
export function refPath(ref: ActionRef): string {
  return ref.sub === "" ? ref.repo : `${ref.repo}/${ref.sub}`;
}

// uses: 行の path / ref / 末尾コメントから参照を組み立てる。ローカル参照（`./...`）と
// owner/repo の形を成さないものは固定対象外として null を返す。
export function parseUses(
  usesPath: string,
  ref: string,
  comment: string | undefined,
): ActionRef | null {
  if (usesPath.startsWith(".")) return null;
  const segments = usesPath.split("/");
  if (segments.length < REPO_SEGMENTS) return null;
  return {
    repo: `${segments[0]}/${segments[1]}`,
    sub: segments.slice(REPO_SEGMENTS).join("/"),
    // 固定済みの行では @ 側が SHA になっているため、版はコメント側が持つ。
    tag: comment || ref,
  };
}

// 固定対象ファイルの一覧。workflow 定義と、リポジトリ内 composite action の定義を集める。
export function targetFiles(root: string): string[] {
  const files: string[] = [];

  const workflowDir = path.join(root, WORKFLOW_DIR);
  for (const entry of readDirOrEmpty(workflowDir)) {
    if (entry.isFile() && YAML_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      files.push(path.join(workflowDir, entry.name));
    }
  }
  collectActionDefinitions(path.join(root, COMPOSITE_ACTION_DIR), files);

  return files.sort();
}

// 対象ファイル群から固定対象の参照をキー単位で集める。同一キーが複数箇所に現れても 1 件に畳む。
export function collectRefs(files: string[]): Map<string, ActionRef> {
  const refs = new Map<string, ActionRef>();
  for (const file of files) {
    const data = fs.readFileSync(file, "utf8");
    for (const match of data.matchAll(usesPattern())) {
      const ref = parseUses(match[2], match[3], match[4]);
      if (ref) refs.set(refKey(ref), ref);
    }
  }
  return refs;
}

// usesPattern で解釈できなかった `uses:` の行番号を返す。
//
// usesPattern が見るのは 1 行 1 ステップのブロック記法だけで、YAML として正当な他の書き方
// （flow mapping・引用符・anchor / alias・タグ・キーと値の行分け）には一致しない。一致しない
// ものは未登録としても未固定としても数えられず、検査が「異常なし」を返してしまう。
//
// そのため判定は許可制にしてある。残った `uses:` は原則すべて対応記法の外と見なし、固定対象に
// なりえない 2 つ——ローカル参照（`./...`）と、版を持たない `owner/repo`——だけを通す。列挙した
// 記法を落とす形にすると、列挙から漏れた書き方が黙って網をすり抜ける。
export function unparsedUsesLines(data: string): number[] {
  // 解釈済みの `uses:` を同じ長さの空白へ潰し、残った `uses:` だけを緩いパターンで拾う。
  const rest = data.replace(usesPattern(), (line) => " ".repeat(line.length));
  const lines: number[] = [];
  for (const [index, line] of rest.split("\n").entries()) {
    // 行全体がコメントなら対象外。散文の中の `uses:` に反応させない。
    if (line.trimStart().startsWith("#")) continue;
    if (!USES_KEY_PATTERN.test(line)) continue;

    const value = LOOSE_USES_PATTERN.exec(line)?.[1];
    // 値がこの行に無い。何を固定すべきかを行から決められない。
    if (value === undefined) {
      lines.push(index + 1);
      continue;
    }
    // ローカル参照は固定対象外。parseUses も対象外にする。
    if (value.startsWith(".")) continue;
    // owner/repo の形を成さない値は、記法そのものが対応外。形を成していて版を持つものは、
    // 対応記法なら usesPattern が既に潰しているので、ここに残る時点で書き換えられない形。
    if (!REPO_VALUE_PATTERN.test(value) || value.includes("@")) lines.push(index + 1);
  }
  return lines;
}

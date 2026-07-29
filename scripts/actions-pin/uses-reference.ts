// `uses:` 行の走査と解釈。固定対象ファイルの列挙と、行から参照 1 件を取り出す責務を持つ。
import fs from "node:fs";
import path from "node:path";

// GitHub Actions の参照 1 件。repo は owner/repo、sub は `codeql-action/init` のようなサブパス、
// tag は固定対象の版。
export type ActionRef = {
  repo: string;
  sub: string;
  tag: string;
};

// uses: [-] owner/repo[/sub]@<ref> [# <tag>]
// 空白を `[ \t]` に限定するのは、`\s` だと改行を食って複数行が 1 マッチに結合するため。
export const USES_PATTERN =
  /^([ \t]*(?:-[ \t]*)?uses:[ \t]*)([^@\s]+)@([^\s#]+)(?:[ \t]*#[ \t]*(\S+))?[ \t]*$/gm;

// 記法を問わず `uses:` とその値を拾う。USES_PATTERN の取りこぼし検出にのみ使う。
const LOOSE_USES_PATTERN = /\buses[ \t]*:[ \t]*['"]?([^\s'",}#]+)/;

const WORKFLOW_DIR = ".github/workflows";
const COMPOSITE_ACTION_DIR = ".github/actions";
const YAML_EXTENSIONS = [".yml", ".yaml"];
const ACTION_FILENAMES = ["action.yml", "action.yaml"];
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

// composite action は `uses: ./.github/actions/<group>/<name>` のように入れ子に置けるため、
// 走査は再帰する。1 階層で打ち切ると、入れ子の定義に書かれた外部参照が固定検査に一度も
// 掛からないまま CI で実行される。
function collectActionDefinitions(dir: string, out: string[]): void {
  for (const entry of readDirOrEmpty(dir)) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectActionDefinitions(target, out);
    } else if (entry.isFile() && ACTION_FILENAMES.includes(entry.name)) {
      out.push(target);
    }
  }
}

// 対象ファイル群から固定対象の参照をキー単位で集める。同一キーが複数箇所に現れても 1 件に畳む。
export function collectRefs(files: string[]): Map<string, ActionRef> {
  const refs = new Map<string, ActionRef>();
  for (const file of files) {
    const data = fs.readFileSync(file, "utf8");
    for (const match of data.matchAll(USES_PATTERN)) {
      const ref = parseUses(match[2], match[3], match[4]);
      if (ref) refs.set(refKey(ref), ref);
    }
  }
  return refs;
}

// USES_PATTERN で解釈できなかった `uses:` の行番号を返す。
//
// USES_PATTERN が見るのは 1 行 1 ステップのブロック記法だけで、YAML として正当な
// flow mapping（`- {name: X, uses: owner/repo@v1}`）には一致しない。一致しないものは
// 未登録としても未固定としても数えられず、検査が「異常なし」を返してしまう。固定の網から
// 外れた参照を黙って通さないよう、対応記法の外を検出して呼び出し元に落とさせる。
export function unparsedUsesLines(data: string): number[] {
  // 解釈済みの `uses:` を同じ長さの空白へ潰し、残った `uses:` だけを緩いパターンで拾う。
  const rest = data.replace(USES_PATTERN, (line) => " ".repeat(line.length));
  const lines: number[] = [];
  for (const [index, line] of rest.split("\n").entries()) {
    // 行全体がコメントなら対象外。散文の中の `uses:` に反応させない。
    if (line.trimStart().startsWith("#")) continue;
    const match = LOOSE_USES_PATTERN.exec(line);
    // 固定対象は `owner/repo@<ref>` の形の外部参照だけ。ローカル参照（`./...`）と
    // 版を持たない参照は parseUses でも対象外なので、取りこぼしには当たらない。
    if (match && !match[1].startsWith(".") && match[1].includes("@")) lines.push(index + 1);
  }
  return lines;
}

// ディレクトリ不在は空として扱う（composite action を持たないリポジトリがあるため）。
// それ以外の読み取り失敗は握り潰さず呼び出し元へ投げる。
function readDirOrEmpty(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

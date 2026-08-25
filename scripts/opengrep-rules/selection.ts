// アーカイブのメンバー一覧から、取り出す 1 件ずつを選ぶ。
//
// **選別をここで済ませてから展開する。** 「全部展開してから要らないものを消す」でも同じ集合に
// なるが、その途中でディスクへ出るものが違う —— 置き場は検体（意図的に脆弱なソース。本物の
// webshell を含む）をルールと同数だけ抱えており、一瞬でも置けばウイルス対策が反応する。
import { RULES_CATEGORY, RULES_EXCLUDED_CATEGORY, RULES_LANGUAGES } from "./manifest.js";

/** ルールとして読む拡張子。opengrep がディレクトリから拾うのもこの 2 つだけ。 */
const RULE_EXTENSIONS = [".yaml", ".yml"];

/**
 * アーカイブのメンバー一覧から、ルールとして取り出すものだけを選ぶ。
 *
 * @remarks
 * codeload の tarball は全メンバーが `<repo>-<commit>/` で始まるため、その 1 段を落として
 * から判定します。段の名前そのものは commit ごとに変わるので、値では見ません。
 *
 * 並びを固定するのは、この一覧が digest の入力になるためです。展開順や列挙順で digest が
 * 動くと、同じ中身に対して照合が落ちます。
 *
 * @param members - アーカイブが持つメンバーのパス（`<repo>-<commit>/…`）
 * @returns 取り出すメンバー。アーカイブ内のパスのまま、辞書順
 */
export function selectRuleMembers(members: readonly string[]): string[] {
  return members.filter(isRuleMember).sort();
}

function isRuleMember(member: string): boolean {
  const segments = member.split("/");
  // 先頭の `<repo>-<commit>/` と、言語 / 分類 / ファイル名で最低 4 段。
  if (segments.length < 4) return false;

  const [, language, ...rest] = segments;
  if (!RULES_LANGUAGES.includes(language as (typeof RULES_LANGUAGES)[number])) return false;

  // 添字ではなく slice で取る。添字は「範囲外なら undefined」の枝を作るが、上の段数の検査で
  // それは起こらず、検査できない分岐だけが残る。
  const fileName = rest.slice(-1).join("");
  if (!RULE_EXTENSIONS.some((extension) => fileName.endsWith(extension))) return false;

  // 分類はディレクトリ名で見る。ファイル名に `security` を含むだけのものを拾わない。
  const directories = rest.slice(0, -1);
  const category = directories.indexOf(RULES_CATEGORY);
  if (category === -1) return false;

  return !directories.slice(category + 1).includes(RULES_EXCLUDED_CATEGORY);
}

/**
 * 外から来る値が make の変数として recipe 行へ展開されていないかを見る。
 *
 * @remarks
 * `$(VAR)` はシェルへ渡る前にテキスト置換されるため、`"` や `;` を含む値でクォートが破れ、任意の
 * コマンドが走ります。規約は `docs/rules.md`「生成物と補助スクリプト」が持ちます。
 *
 * **「外から来る」は Makefile の形からは決まりません。** `?=` で既定を持つ変数が、外から渡される
 * のか内側の定数なのかは呼び出し元を辿らないと分かりません。ここが見るのは決定可能な中核だけ
 * —— **木のどこにも代入が無い変数**は、外からしか来ようがありません。
 *
 * したがってこの検査は、`?=` だけを持つ変数の展開を見逃します。そこは人のレビューが拾います。
 */

/** make 自身の関数と自動変数。値の出所がリポジトリの外ではない。 */
const BUILTIN: ReadonlySet<string> = new Set([
  "MAKE",
  "MAKEFLAGS",
  "CURDIR",
  "SHELL",
  ".DEFAULT_GOAL",
]);

/** 変数への代入。`?=` も代入として数える —— 中核の判定は「代入が 1 つも無い」である。 */
const ASSIGNMENT = /^[ \t]*([A-Za-z_]\w*)[ \t]*[:?+!]?=/;

/**
 * 引数を取らない変数の展開。
 *
 * @remarks
 * 関数呼び出し（空白や `,` を含む）は当たりません。直前の `$` を除くのは、`$$(cmd)` が make の
 * 展開ではなく**シェルの実行置換**だからです。除かないと、シェルの書き方を違反として報告します。
 */
const EXPANSION = /(?<!\$\$\()(?<=\$\()[A-Za-z_]\w*(?=\))/g;

/**
 * リテラルだけで絞る `filter`。ここに渡った値は候補のどれかか空にしかならない。
 *
 * @remarks
 * `%` を含む型は先頭一致以降が素通りするので、有界化と見なしません。
 */
const BOUNDED_FILTER = /\$\(filter [^%,()]*,(?:[^()]|\$\([^()]*\))*\)/g;

/** `define` の開始と終了。本体は recipe ではない。 */
const DEFINE_START = /^[ \t]*define[ \t]/;
const DEFINE_END = /^[ \t]*endef[ \t]*$/;

/** 見つかった 1 件。 */
export interface BareExpansion {
  /** リポジトリ相対のパス。 */
  readonly file: string;
  /** 1 始まりの行。 */
  readonly line: number;
  /** 展開されている変数の名前。 */
  readonly variable: string;
}

/**
 * 木のどこかで代入されている変数の名前を集める。
 *
 * @param sources - ファイルの中身（順不同）。
 * @returns 代入を持つ名前。
 */
export function assignedNames(sources: readonly string[]): Set<string> {
  const names = new Set<string>();

  for (const source of sources) {
    for (const line of source.split("\n")) {
      const name = ASSIGNMENT.exec(line)?.[1];

      if (name !== undefined) names.add(name);
    }
  }

  return names;
}

/**
 * ファイル 1 つから、外から来る値の展開を集める。
 *
 * @param file - リポジトリ相対のパス。
 * @param source - そのファイルの中身。
 * @param assigned - 木のどこかで代入されている名前（{@link assignedNames}）。
 * @returns 見つかった箇所。無ければ空。
 */
export function findBareExpansions(
  file: string,
  source: string,
  assigned: ReadonlySet<string>,
): BareExpansion[] {
  const found: BareExpansion[] = [];
  let inDefine = false;

  source.split("\n").forEach((line, index) => {
    if (DEFINE_START.test(line)) inDefine = true;
    else if (DEFINE_END.test(line)) inDefine = false;
    else if (!inDefine && line.startsWith("\t")) {
      for (const [name] of line.replace(BOUNDED_FILTER, "").matchAll(EXPANSION)) {
        if (!assigned.has(name) && !BUILTIN.has(name)) {
          found.push({ file, line: index + 1, variable: name });
        }
      }
    }
  });

  return found;
}

/**
 * 見つかった箇所を、そのまま読める 1 つの文字列へ組む。
 *
 * @param found - {@link findBareExpansions} が集めた箇所。
 * @returns 1 行 1 件の報告。
 */
export function formatBareExpansions(found: readonly BareExpansion[]): string {
  return found
    .map(({ file, line, variable }) => `${file}:${line} — ${variable} を export で渡す`)
    .join("\n");
}

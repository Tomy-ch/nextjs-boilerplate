import ts from "typescript";

/**
 * 名前の付いた関数が TSDoc の枠を持っているかを見る。
 *
 * @remarks
 * 規約は `docs/rules.md`「コメントと文書」が持ちます。ここが見るのは**宣言の形から決まる分**
 * だけです —— 要約の有無と、引数を持つ関数の `@param`。`@returns` は見ません：戻り値の種別は
 * 型注釈を持たない関数では宣言の形から決まらず、「書かない」と決まっている場合（`void` を返す
 * 関数、JSX を返す component）と見分けられません。
 *
 * 対象から外すものは規約が名指ししています。**名前で呼ぶ読み手が居ない**もの（Next.js の特殊
 * ファイルが framework へ渡す export）と、**意図を別の場所が運ぶ**もの（テストファイルの中の
 * 関数は `it` の日本語名が運ぶ）です。object literal のメソッドも外します —— 呼び出し地点の
 * hover に出るのは実装ではなく型の側のメンバーです。**原理は 1 つ** —— 読み手の hover が型の
 * メンバーへ解決されるなら、doc は型の側が持ちます。規約が component の props について明文化
 * しているのは、この原理の 1 適用です。
 */

/** framework が名前で呼ぶファイル。ここの export は、人が名前で呼ぶ読み手を持たない。 */
const FRAMEWORK_BASENAMES: ReadonlySet<string> = new Set([
  "apple-icon",
  "default",
  "error",
  "global-error",
  "icon",
  "instrumentation",
  "layout",
  "loading",
  "manifest",
  "middleware",
  "not-found",
  "opengraph-image",
  "page",
  "proxy",
  "robots",
  "route",
  "sitemap",
  "template",
  "twitter-image",
]);

/** 走査から外すファイル。意図を別の場所が運ぶものと、契約からの生成物。 */
const SKIPPED = /\.test\.tsx?$|\.stories\.tsx?$|^src\/adapters\/gen\//;

/** 欠けている枠 1 件。 */
export interface MissingFrame {
  /** リポジトリ相対のパス。 */
  readonly file: string;
  /** 1 始まりの行。 */
  readonly line: number;
  /** 関数の名前。 */
  readonly name: string;
  /** 何が欠けているか。 */
  readonly missing: "doc" | "param";
}

/** その名前で framework が呼ぶファイルか。 */
function isFrameworkFile(file: string): boolean {
  const basename = file.slice(file.lastIndexOf("/") + 1);

  return FRAMEWORK_BASENAMES.has(basename.replace(/\.(tsx|ts)$/, "").replace(/\.dev$/, ""));
}

/** doc comment を持つ宣言か。`const f = …` の doc は、包む文の側に付く。 */
function documented(node: ts.Node): boolean {
  return ts.getJSDocCommentsAndTags(node).length > 0;
}

/** `@param` を持つ doc comment か。 */
function hasParamTag(node: ts.Node): boolean {
  return ts.getJSDocTags(node).some((tag) => tag.tagName.text === "param");
}

/**
 * 読み手の hover が、この実装ではなく型のメンバーへ解決されるか。
 *
 * @remarks
 * object literal は文脈の型が、`implements` を持つクラスはその型が、呼び出し地点の hover を
 * 占めます。どちらも doc は型の側が持ち、実装は持ちません。
 */
function typeCarriesTheDoc(node: ts.Node): boolean {
  const { parent } = node;

  if (ts.isObjectLiteralExpression(parent)) {
    return true;
  }

  return (
    (ts.isClassDeclaration(parent) || ts.isClassExpression(parent)) &&
    (parent.heritageClauses ?? []).some(
      (clause) => clause.token === ts.SyntaxKind.ImplementsKeyword,
    )
  );
}

/** 初期化子が関数である変数宣言か。 */
function initializesFunction(node: ts.VariableDeclaration): boolean {
  return (
    node.initializer !== undefined &&
    (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
  );
}

/**
 * 名前の付いた関数を集める。
 *
 * @param source - 構文木の根。
 * @returns 宣言の節点と、その名前の対。同じ名前の関数宣言が続く（多重定義）ときは最初の 1 つだけ。
 */
function namedFunctions(source: ts.SourceFile): { node: ts.Node; name: string }[] {
  const found: { node: ts.Node; name: string }[] = [];
  const seen = new Set<string>();

  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      // 多重定義は先頭の宣言だけが doc を持つ。呼び出し地点の hover もそちらを出す。
      if (!seen.has(node.name.text)) {
        seen.add(node.name.text);
        found.push({ name: node.name.text, node });
      }
    } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      if (!typeCarriesTheDoc(node)) found.push({ name: node.name.text, node });
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      initializesFunction(node)
    ) {
      found.push({ name: node.name.text, node });
    }

    ts.forEachChild(node, visit);
  }

  visit(source);

  return found;
}

/**
 * その宣言が受け取る引数のうち、**読み手に名前が見えるもの**の数。
 *
 * @remarks
 * 分割代入で受ける引数は数えません。読み手に見える名前が無く、各メンバーの doc は型の側が
 * 持つためです（{@link typeCarriesTheDoc} と同じ原理）。`@param` を求めても、書けるのは
 * 定型文だけになります。
 */
function namedParameterCount(node: ts.Node): number {
  const parameters =
    ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)
      ? node.parameters
      : functionParameters(node);

  return parameters.filter((parameter) => ts.isIdentifier(parameter.name)).length;
}

/** 変数へ入れた関数の引数。関数でなければ空。 */
function functionParameters(node: ts.Node): readonly ts.ParameterDeclaration[] {
  const { initializer } = node as ts.VariableDeclaration;

  return initializer !== undefined && ts.isFunctionLike(initializer) ? initializer.parameters : [];
}

/**
 * ファイル 1 つから、枠を欠いた関数を集める。
 *
 * @param file - リポジトリ相対のパス。対象外の判定に使う。
 * @param source - そのファイルの中身。
 * @returns 欠けている箇所。対象外のファイルと、欠けが無いファイルは空。
 */
export function findMissingFrames(file: string, source: string): MissingFrame[] {
  if (SKIPPED.test(file) || isFrameworkFile(file)) {
    return [];
  }

  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);

  return namedFunctions(tree).flatMap(({ node, name }): MissingFrame[] => {
    const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;

    if (!documented(node)) {
      return [{ file, line, missing: "doc", name } as const];
    }

    if (namedParameterCount(node) > 0 && !hasParamTag(node)) {
      return [{ file, line, missing: "param", name } as const];
    }

    return [];
  });
}

/**
 * 欠けている箇所を、そのまま読める 1 つの文字列へ組む。
 *
 * @param found - {@link findMissingFrames} が集めた箇所。
 * @returns 1 行 1 件の報告。
 */
export function formatMissingFrames(found: readonly MissingFrame[]): string {
  const label = { doc: "要約が無い", param: "`@param` が無い" } as const;

  return found
    .map(({ file, line, missing, name }) => `${file}:${line} ${name} — ${label[missing]}`)
    .join("\n");
}

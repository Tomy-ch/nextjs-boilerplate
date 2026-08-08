import ts from "typescript";

/**
 * 1:1 テスト対応原則を機械判定する。
 *
 * @remarks
 * 原則は「呼べる export はすべて、自分の名前の最上位 `describe` を 1 つだけ持つ」
 * ([0090](../../docs/adr/0090-testing-strategy.md))。`describe` が主語で `it` が述語という
 * JS/TS の一般的な構成に、export との 1 対 1 を機械判定として足したもの。
 *
 * `describe` の内側をどう束ねるかは判定しない。観点ごとに入れ子の `describe` で分ける規約は
 * あるが、束ね方はテストの中身しだいで妥当な形が変わり、名前を固定すると実態と合わない
 * グループを置くだけの作業になる。ここが見るのは「どの export の契約がどこに在るか」だけ。
 *
 * このモジュールは fs も `ts.Program` も持たない。走査と型解決はゲート側が担い、ここは
 * 「読み取り済みの構文木と、呼べるかどうかの判定」から違反を導くところだけを持つ。
 */

/** export 1 件。 */
export type ExportedSymbol = {
  readonly name: string;
  readonly line: number;
  /**
   * 専用の describe を要求する対象か。
   *
   * @remarks
   * 呼べる値(関数・クラス・React コンポーネント・`cva()` の戻り値など)だけが true になります。
   * 定数や zod スキーマは false で、describe を要求されません。ただし describe を書くこと自体は
   * 許されます(production シンボルに対応しない契約テストは 1:1 違反ではない、という規約に従う)。
   */
  readonly testable: boolean;
};

/** テストファイル中の最上位 describe 1 件。 */
export type DescribeNode = {
  readonly name: string;
  readonly line: number;
};

export type ViolationKind =
  /** export に対応する describe が無い。 */
  | "missing-describe"
  /** テストファイルそのものが無い。 */
  | "missing-test-file"
  /** 同じ export に describe が 2 つ以上ある。 */
  | "duplicate-describe"
  /** 最上位 describe の名前がどの export とも対応しない(束ね describe を含む)。 */
  | "unknown-describe";

export type Violation = {
  readonly kind: ViolationKind;
  readonly file: string;
  readonly line: number;
  readonly message: string;
};

/** 1 ファイル分の検査入力。 */
export type FileInput = {
  /** 検査対象の production ファイル(リポジトリ相対)。 */
  readonly file: string;
  /** 対応するテストファイル(リポジトリ相対)。存在しなければ null。 */
  readonly testFile: string | null;
  readonly exports: readonly ExportedSymbol[];
  /** テストファイルの最上位 describe 一覧。入れ子は見ない。 */
  readonly describes: readonly DescribeNode[];
};

/** ノードの開始行(1 始まり)を返す。 */
function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

/** `describe` の第 1 引数がリテラル文字列なら取り出す。 */
function literalTitle(node: ts.CallExpression): string | null {
  const [first] = node.arguments;

  if (first === undefined) {
    return null;
  }

  return ts.isStringLiteralLike(first) ? first.text : null;
}

/** 呼び出しが `describe(...)` / `describe.only(...)` などであれば true。 */
function isDescribeCall(node: ts.CallExpression): boolean {
  const callee = node.expression;

  if (ts.isIdentifier(callee)) {
    return callee.text === "describe";
  }

  return (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === "describe"
  );
}

/**
 * テストファイルの最上位 describe を読む。
 *
 * @remarks
 * 型は見ない。`describe` は import 名で判別できる呼び出しであり、構文だけで拾える。
 * 入れ子へは降りない。内側の束ね方は判定対象ではなく、降りると内側の観点名を
 * 「export に対応しない describe」として誤って咎める。
 */
export function collectTopLevelDescribes(sourceText: string, fileName: string): DescribeNode[] {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true);
  const found: DescribeNode[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && isDescribeCall(node)) {
      const title = literalTitle(node);

      if (title !== null) {
        found.push({ name: title, line: lineOf(source, node) });

        return;
      }
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);

  return found;
}

/**
 * テスト対象になりうる export を読む。
 *
 * @remarks
 * `isCallable` に「その名前が呼べる値か」を渡す。呼べないもの(定数・配列・zod スキーマ)は
 * 対象外にします。呼べるかどうかは構文では決まらない(`cva(...)` は関数を返し `z.object(...)` は
 * 返さない)ため、判定は型を持つ側へ委ねます。
 */
export function collectTestableExports(
  sourceText: string,
  fileName: string,
  isCallable: (name: string) => boolean,
): ExportedSymbol[] {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true);
  const found: ExportedSymbol[] = [];

  const add = (name: string, node: ts.Node): void => {
    found.push({ name, line: lineOf(source, node), testable: isCallable(name) });
  };

  const exported = (node: ts.Node): boolean =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

  ts.forEachChild(source, (node) => {
    if (ts.isFunctionDeclaration(node) && exported(node) && node.name !== undefined) {
      add(node.name.text, node);

      return;
    }

    if (ts.isClassDeclaration(node) && exported(node) && node.name !== undefined) {
      add(node.name.text, node);

      return;
    }

    if (ts.isVariableStatement(node) && exported(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          add(decl.name.text, decl);
        }
      }

      return;
    }

    // `export { A, B as C }`。宣言に export 修飾子を付けず末尾でまとめて出す形は珍しくなく、
    // 見落とすと 1 ファイル分の export がまるごと検査から外れる。公開される名前は別名の側。
    if (ts.isExportDeclaration(node) && node.exportClause !== undefined) {
      const clause = node.exportClause;

      if (ts.isNamedExports(clause)) {
        for (const element of clause.elements) {
          if (!element.isTypeOnly && !node.isTypeOnly) {
            add(element.name.text, element);
          }
        }
      }
    }
  });

  return found;
}

/**
 * 1 ファイル分の 1:1 対応を検査する。
 *
 * @remarks
 * 「export に describe が無い」と「describe に対応する export が無い」の両方向を見る。
 * 片方向だけだと、export を消してテストだけ残った状態や、テストを別名へ改名した状態が
 * 検査をすり抜ける。
 */
export function checkFile(input: FileInput): Violation[] {
  const required = input.exports.filter((s) => s.testable);

  if (required.length === 0) {
    return [];
  }

  if (input.testFile === null) {
    return required.map((symbol) => ({
      kind: "missing-test-file" as const,
      file: input.file,
      line: symbol.line,
      message: `${symbol.name} に対応するテストファイルがありません`,
    }));
  }

  const testFile = input.testFile;
  const violations: Violation[] = [];
  const byName = new Map<string, DescribeNode[]>();

  for (const node of input.describes) {
    byName.set(node.name, [...(byName.get(node.name) ?? []), node]);
  }

  // describe を「要求する」のは呼べる export だけですが、「許す」のは export 全体です。
  // 定数の契約テストは production の関数に対応しませんが、退行を単独で捕まえるので違反ではない。
  const exportNames = new Set(input.exports.map((s) => s.name));

  for (const node of input.describes) {
    if (exportNames.has(node.name)) {
      continue;
    }

    violations.push({
      kind: "unknown-describe",
      file: testFile,
      line: node.line,
      message: `describe("${node.name}") はどの export にも対応しません。最上位の describe は export 名にし、観点ごとの束ねはその内側へ入れてください`,
    });
  }

  for (const symbol of required) {
    const nodes = byName.get(symbol.name) ?? [];
    const [first, second] = nodes;

    if (first === undefined) {
      violations.push({
        kind: "missing-describe",
        file: input.file,
        line: symbol.line,
        message: `${symbol.name} に対応する describe("${symbol.name}") が ${testFile} にありません`,
      });

      continue;
    }

    if (second !== undefined) {
      violations.push({
        kind: "duplicate-describe",
        file: testFile,
        line: second.line,
        message: `describe("${symbol.name}") が ${nodes.length} つあります。1 つにまとめてください`,
      });
    }
  }

  return violations;
}

/** 違反一覧を、失敗メッセージとして読める 1 つの文字列へ整形する。 */
export function formatViolations(violations: readonly Violation[]): string {
  return violations
    .map((v) => `${v.file}:${v.line}: [${v.kind}] ${v.message}`)
    .sort((a, b) => (a < b ? -1 : 1))
    .join("\n");
}

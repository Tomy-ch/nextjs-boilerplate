import { builtinModules } from "node:module";

import ts from "typescript";

/** Node.js にしか無い入口を引いている module と、入口からそこへ届いた経路。 */
export type NodeOnlyImport = {
  /** 入口から違反した module までの、リポジトリルート相対のパスの並び。 */
  readonly chain: readonly string[];
  readonly specifier: string;
};

const NODE_BUILTINS: ReadonlySet<string> = new Set(builtinModules);

/**
 * その綴りが Node.js の実行環境にしか無い入口か。
 *
 * @param specifier - import の綴り
 * @returns `node:` 接頭辞・素の組み込み module 名（`fs/promises` のような下位の綴りを含む）・
 *   `dotenv` のいずれかなら true
 */
export function isNodeOnlySpecifier(specifier: string): boolean {
  if (specifier.startsWith("node:")) {
    return true;
  }

  const slashAt = specifier.indexOf("/");
  const head = slashAt < 0 ? specifier : specifier.slice(0, slashAt);

  return NODE_BUILTINS.has(head) || head === "dotenv";
}

/**
 * 名前を並べた import / export の要素がすべて `type` 修飾子を持つか。
 *
 * @param elements - 並べた名前
 * @returns 1 つ以上あり、すべて型だけなら true
 */
function allTypeOnly(elements: ts.NodeArray<ts.ImportSpecifier | ts.ExportSpecifier>): boolean {
  return elements.length > 0 && elements.every((element) => element.isTypeOnly);
}

/**
 * 1 文が実行時に引く先。引かないか型だけの文なら null。
 *
 * @param statement - 最上位の文
 * @returns 引く先の綴り
 */
function runtimeSpecifierOf(statement: ts.Statement): string | null {
  if (ts.isImportDeclaration(statement)) {
    const clause = statement.importClause;
    const named = clause?.namedBindings;
    const typeOnly =
      clause !== undefined &&
      (clause.isTypeOnly ||
        (clause.name === undefined &&
          named !== undefined &&
          ts.isNamedImports(named) &&
          allTypeOnly(named.elements)));

    return !typeOnly && ts.isStringLiteral(statement.moduleSpecifier)
      ? statement.moduleSpecifier.text
      : null;
  }

  if (ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined) {
    const clause = statement.exportClause;
    const typeOnly =
      statement.isTypeOnly ||
      (clause !== undefined && ts.isNamedExports(clause) && allTypeOnly(clause.elements));

    return !typeOnly && ts.isStringLiteral(statement.moduleSpecifier)
      ? statement.moduleSpecifier.text
      : null;
  }

  return null;
}

/**
 * ソースが実行時に引く先を、出てきた順に並べる。
 *
 * @param path - ソースのパス。`.tsx` なら TSX として読む
 * @param content - ソース
 * @returns 静的な import / re-export と、文字列リテラルを渡した動的な `import()` の綴り
 */
export function runtimeImportsOf(path: string, content: string): string[] {
  const source = ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: string[] = [];

  for (const statement of source.statements) {
    const specifier = runtimeSpecifierOf(statement);

    if (specifier !== null) {
      found.push(specifier);
    }
  }

  /**
   * 文字列リテラルを渡した動的な `import()` を拾いながら、構文木を降りる。
   *
   * @param node - 見る節
   */
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments;

      if (argument !== undefined && ts.isStringLiteralLike(argument)) {
        found.push(argument.text);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  return found;
}

/**
 * 入口から静的に辿れる module のうち、Node.js にしか無い入口を引くものを挙げる。
 *
 * @param entry - 辿り始める module（リポジトリルート相対）
 * @param load - パスからソースを読む。読めなければ null
 * @param resolve - import 先をリポジトリルート相対のパスへ解決する。辿らない綴りは null
 * @returns 違反ごとに、入口からの最短の経路と引いた綴り
 */
export function findNodeOnlyImports(
  entry: string,
  load: (path: string) => string | null,
  resolve: (from: string, specifier: string) => string | null,
): NodeOnlyImport[] {
  const parent = new Map<string, string | null>([[entry, null]]);
  const queue = [entry];
  const found: NodeOnlyImport[] = [];

  /**
   * 入口からその module までの経路を組む。
   *
   * @param path - 経路の終わりの module
   * @returns 入口から始まるパスの並び
   */
  const chainTo = (path: string): string[] => {
    const chain: string[] = [];

    for (let at: string | null | undefined = path; typeof at === "string"; at = parent.get(at)) {
      chain.unshift(at);
    }

    return chain;
  };

  for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
    const content = load(current);

    if (content === null) {
      continue;
    }

    for (const specifier of runtimeImportsOf(current, content)) {
      if (isNodeOnlySpecifier(specifier)) {
        found.push({ chain: chainTo(current), specifier });
        continue;
      }

      const target = resolve(current, specifier);

      if (target !== null && !parent.has(target)) {
        parent.set(target, current);
        queue.push(target);
      }
    }
  }

  return found;
}

/**
 * 見つかったものを人が読む形にする。
 *
 * @param found - 違反の並び
 * @returns 1 違反 1 行。違反が無ければ空文字列
 */
export function formatNodeOnlyImports(found: readonly NodeOnlyImport[]): string {
  return found
    .map(({ chain, specifier }) => `${chain.join(" -> ")}: ${specifier} を引いています`)
    .sort((a, b) => a.localeCompare(b))
    .join("\n");
}

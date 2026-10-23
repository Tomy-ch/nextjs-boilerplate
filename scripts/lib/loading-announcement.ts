import ts from "typescript";

// 待機表示が、読み込み中であることを支援技術へ告げる葉を置いているかの判定。

/** 走査する module 1 件。 */
export type SourceModule = {
  /** リポジトリルート相対のパス。 */
  readonly path: string;
  readonly content: string;
};

/** 待機表示の module の綴り。 */
const SKELETON_MODULE_SUFFIX = "/ui/skeleton/skeleton.tsx";

const LEAF_SPECIFIER = "@/components/shell/loading-announcer/loading-announcer";

/**
 * 告知の module から、値として取り込んだ手元の名前。取り込んでいなければ `null`。
 *
 * @param source - 読む module
 * @param name - 告知の module が書き出す名前
 * @returns 別名で取り込んでいればその名前、`import type` だけなら `null`
 */
function localNameOf(source: ts.SourceFile, name: string): string | null {
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== LEAF_SPECIFIER ||
      statement.importClause === undefined ||
      statement.importClause.isTypeOnly
    ) {
      continue;
    }

    const bindings = statement.importClause.namedBindings;

    if (bindings === undefined || !ts.isNamedImports(bindings)) {
      continue;
    }

    const element = bindings.elements.find(
      (candidate) =>
        !candidate.isTypeOnly && (candidate.propertyName ?? candidate.name).text === name,
    );

    if (element !== undefined) {
      return element.name.text;
    }
  }

  return null;
}

/**
 * その名前の要素を JSX として置いているか。
 *
 * @param node - 探し始める節
 * @param tag - 探す要素の名前
 * @returns 開始タグか自己終了タグとして置いていれば `true`
 */
function rendersTag(node: ts.Node, tag: string): boolean {
  if (
    (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
    ts.isIdentifier(node.tagName) &&
    node.tagName.text === tag
  ) {
    return true;
  }

  return ts.forEachChild(node, (child) => rendersTag(child, tag)) ?? false;
}

/**
 * 告知の module から取り込み、JSX として置いているか。
 *
 * @param module - 読む module
 * @param name - 告知の module が書き出す名前
 * @returns 取り込んで置いていれば `true`
 */
function importsAndRenders(module: SourceModule, name: string): boolean {
  const source = ts.createSourceFile(
    module.path,
    module.content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const local = localNameOf(source, name);

  return local !== null && rendersTag(source, local);
}

/**
 * 待機表示の module か。
 *
 * @param path - リポジトリルート相対のパス
 * @returns 待機表示の綴りなら `true`
 */
export function isSkeletonModule(path: string): boolean {
  return path.endsWith(SKELETON_MODULE_SUFFIX);
}

/**
 * 葉を置いていない待機表示を返す。
 *
 * @param modules - 走査した module
 * @returns 待機表示のうち、`LoadingAnnouncement` を取り込んで置いていないもののパス
 */
export function findSilentSkeletons(modules: readonly SourceModule[]): readonly string[] {
  return modules
    .filter(({ path }) => isSkeletonModule(path))
    .filter((module) => !importsAndRenders(module, "LoadingAnnouncement"))
    .map(({ path }) => path)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * root layout が告げる領域の Provider を置いているか。
 *
 * @param module - root layout
 * @returns 取り込んで置いていれば `true`
 */
export function mountsAnnouncer(module: SourceModule): boolean {
  return importsAndRenders(module, "LoadingAnnouncerProvider");
}

import { errorMessage } from "../lib/error-message";
import { type DeclarationSite, resolveDeclarationSite } from "./declaration-site";
import {
  applyImportsAllowed,
  type BoundaryFrontmatter,
  declaresBoundary,
  findBoundaryDrift,
  parseBoundaryFrontmatter,
} from "./readme-boundaries";

/** 走査が見つけた 1 件。`node:fs` の `Dirent` から必要な述語だけを取り出した形。 */
export type ScanEntry = {
  readonly name: string;
  readonly isDirectory: boolean;
  readonly isSymbolicLink: boolean;
};

/** 読み込んだ README。 */
export type ReadmeSource = {
  readonly path: string;
  readonly source: string;
};

/** 境界を宣言している README と、そこが宣言すべき依存。 */
export type Declared = ReadmeSource & {
  readonly site: DeclarationSite;
  readonly declaration: BoundaryFrontmatter;
};

/**
 * 走査が 1 件をどう扱うか。
 *
 * @remarks
 * `Dirent.isDirectory()` はシンボリックリンクに false を返すので、名前だけで拾うと `README.md`
 * という名前のリンクがファイルとして集まります。`writeFileSync` はリンクを辿って解決先を
 * 書き換えるため、生成がツリーの外のファイルへ届きます。このリポジトリは複数の worktree が
 * 1 ホストを共有する前提なので、届く先には隣の作業ツリーが含まれます。
 *
 * 判断をここへ切り出しているのは、**遣り取りをせずに答えを出せるから**です
 * （`scripts/lib/untested-modules.ts` の `ENTRYPOINT_PATTERNS`）。`readdirSync` を呼ぶ walk 自体は
 * 遣り取りなので入口に残ります。
 */
export function scanAction(entry: ScanEntry): "recurse" | "collect" | "skip" {
  if (entry.isSymbolicLink) {
    return "skip";
  }

  if (entry.isDirectory) {
    return "recurse";
  }

  return entry.name === "README.md" ? "collect" : "skip";
}

/** README を持つディレクトリ。リポジトリルート相対で、区切りは `/`。 */
function directoryOf(readmePath: string): string {
  return readmePath.split("/").slice(0, -1).join("/");
}

/**
 * README を「宣言を持つもの」と「置き場の誤り」へ振り分ける。
 *
 * @remarks
 * **宣言を持つものだけを受け取りません。** 呼ぶ側が宣言の有無で絞ると、「宣言してよい場所なのに
 * 宣言していない」も「宣言してはいけない場所で宣言している」も検査の外へ出ます。前者は黙って
 * 素通りし、後者は書いた側だけが宣言済みだと思う状態になります。
 *
 * 置き場の誤りは宣言の中身を見る前に決まります。先に全件を振り分ける理由は
 * {@link decideOutcome} が持ちます。
 */
export function classifyReadmes(sources: readonly ReadmeSource[]): {
  declared: Declared[];
  failures: string[];
} {
  const declared: Declared[] = [];
  const failures: string[] = [];

  for (const { path, source } of sources) {
    const site = resolveDeclarationSite(directoryOf(path));

    if (site === null) {
      if (declaresBoundary(source)) {
        failures.push(
          `${path}: 要素の根ではないので境界を宣言できません。宣言はここを含む要素の根が持ちます (境界は要素に付き、test-requirement と coverage-exclusions はディレクトリに付きます)`,
        );
      }

      continue;
    }

    if (!declaresBoundary(source)) {
      failures.push(
        `${path}: 要素 ${site.type} の根なので imports-allowed と forbidden を宣言してください`,
      );
      continue;
    }

    try {
      declared.push({ path, source, site, declaration: parseBoundaryFrontmatter(source) });
    } catch (error) {
      failures.push(`${path}: ${errorMessage(error)}`);
    }
  }

  return { declared, failures };
}

/** 宣言が要素の依存とずれている箇所。空配列なら一致している。 */
export function formatDrift(declared: readonly Declared[]): string[] {
  return declared.flatMap(({ path, site, source, declaration }) =>
    findBoundaryDrift(site.dependencies, source, declaration).map(
      (message) => `${path}: ${message}`,
    ),
  );
}

/**
 * 書き戻す README と、その本文を組む。
 *
 * @remarks
 * **書き込みそのものは持ちません。** 組む側と書く側を分けている理由は {@link decideOutcome} が
 * 持ちます。
 */
export function planImportsAllowedWrites(
  declared: readonly Declared[],
): { path: string; content: string }[] {
  return declared.flatMap(({ path, site, source }) => {
    const applied = applyImportsAllowed(source, site.dependencies);

    return applied === null || applied === source ? [] : [{ path, content: applied }];
  });
}

/** 走らせた結果。入口はこれを受け取って出力と終了コードだけを決める。 */
export type Outcome =
  | { readonly kind: "failed"; readonly messages: string[] }
  | { readonly kind: "written"; readonly writes: { path: string; content: string }[] }
  | { readonly kind: "passed" };

/**
 * 走査の結果から、何を出すかを決める。
 *
 * @remarks
 * 1 件ずつ書きながら走ると、後続で失敗したときに一部だけ書き換わった作業ツリーが残り、しかも
 * 終了コードは失敗なので、走らせた側は「何も変わっていない」と読みます。置き場の誤りを先に
 * 全件裁いてからでないと書き込みへ進めない形を、ここが持ちます。
 *
 * 判定をここへ置く理由は {@link scanAction} と同じです。入口に残るのは `readdirSync` /
 * `writeFileSync` と、終了コードだけになります。
 */
export function decideOutcome(
  sources: readonly ReadmeSource[],
  missingKernelReadmes: readonly string[],
  mode: "check" | "write",
): Outcome {
  const { declared, failures } = classifyReadmes(sources);
  const structural = [...missingKernelReadmes, ...failures];

  if (structural.length) {
    return { kind: "failed", messages: structural };
  }

  if (mode === "write") {
    const writes = planImportsAllowedWrites(declared);
    const byPath = new Map(writes.map(({ path, content }) => [path, content]));
    // 生成し終えた姿で裁き直す。生成が直せない食い違い（フロー形式でない宣言、禁止との矛盾）は
    // 書き込みの計画に現れないので、計画の件数だけを見ると「0 件生成して成功」になり、同じ入力で
    // check が落ちることに走らせた側は気づけない。
    const remaining = formatDrift(
      declared.map((entry) => ({ ...entry, source: byPath.get(entry.path) ?? entry.source })),
    );

    return remaining.length ? { kind: "failed", messages: remaining } : { kind: "written", writes };
  }

  const drift = formatDrift(declared);

  return drift.length ? { kind: "failed", messages: drift } : { kind: "passed" };
}

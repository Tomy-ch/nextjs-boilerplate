// サンプル破棄の「過不足なし」を判定する規則。入口（./index.ts）はスナップショットの読み込み・
// git / make / grep の起動・終了コードだけを担う。
//
// このモジュールは検証成功後、入口と一緒に消える（理由は selfDestructTargets）。

/** サンプル破棄を起動する make ターゲット。`.mk` のマーカー除去で消えるべきもの。 */
const SAMPLE_MAKE_TARGET = "setup-remove-sample";

/**
 * 残留サンプル参照を洗い出す shell コマンド。ヒット無しでも非 0 で落ちないようにする。
 *
 * @remarks
 * 語彙を import ではなく引数で受け取る理由は `sample-manifest.ts` の `DANGLING_PATTERN` が
 * 持ちます —— 検証が走る時点で、そのモジュール自体が消えています。
 *
 * @param danglingPattern - manifest が宣言した題材の語彙
 */
export function buildDanglingCommand(danglingPattern: string): string {
  return `grep -rniE '${danglingPattern}' src/ mocks/ --include='*.ts' --include='*.tsx' || true`;
}

/**
 * remove-sample が書き出したスナップショットから、削除と置き直しの登録を取り出す。
 *
 * @throws JSON として読めない、`registeredPaths` が配列でない・空、`restoredPaths` が配列でない、
 * または `danglingPattern` が文字列でない・空の場合。
 */
export function parseSnapshot(json: string): {
  registeredPaths: string[];
  restoredPaths: string[];
  danglingPattern: string;
} {
  const parsed = JSON.parse(json) as {
    registeredPaths?: unknown;
    restoredPaths?: unknown;
    danglingPattern?: unknown;
  };

  if (!Array.isArray(parsed.registeredPaths) || parsed.registeredPaths.length === 0) {
    throw new Error("スナップショットの registeredPaths が空です");
  }

  // 空を許すのは registeredPaths と違い、置き直しが 0 件でも破棄そのものは成立するためである。
  // 配列でないものは書き出しの欠落なので落とす。
  if (!Array.isArray(parsed.restoredPaths)) {
    throw new Error("スナップショットに restoredPaths がありません");
  }

  if (typeof parsed.danglingPattern !== "string" || parsed.danglingPattern === "") {
    throw new Error("スナップショットの danglingPattern が空です");
  }

  return {
    registeredPaths: parsed.registeredPaths as string[],
    restoredPaths: parsed.restoredPaths as string[],
    danglingPattern: parsed.danglingPattern,
  };
}

/** `git status --porcelain` の出力から削除エントリの相対パスを取り出す。 */
export function parseDeletedPaths(porcelain: string): string[] {
  return porcelain
    .split("\n")
    .filter((line) => line.length > 3 && (line.startsWith("D") || line[1] === "D"))
    .map((line) => line.slice(3));
}

/** 不足検出: 登録パスがまだ残っていれば「消えていない」。 */
export function findUnremovedPaths(
  registeredPaths: readonly string[],
  pathExists: (relativePath: string) => boolean,
): string[] {
  return registeredPaths
    .filter((relativePath) => pathExists(relativePath))
    .map((relativePath) => `未削除の登録パス: ${relativePath}`);
}

/**
 * 不足検出: 置き直すはずのファイルが無ければ「置き直していない」。
 *
 * @remarks
 * 削除と違い、置き直しの失敗は**残る木に穴が開く**形で現れます。穴は build では見えず
 * （route が 1 つ減るだけ）、開いてはじめて 404 として出るので、ここで見ます。
 */
export function findMissingRestorations(
  restoredPaths: readonly string[],
  pathExists: (relativePath: string) => boolean,
): string[] {
  return restoredPaths
    .filter((relativePath) => !pathExists(relativePath))
    .map((relativePath) => `置き直されていないパス: ${relativePath}`);
}

/** 過剰検出: 登録パスに含まれない削除は想定外（サンプル以外を巻き込んでいる）。 */
export function findUnregisteredDeletions(
  registeredPaths: readonly string[],
  deletedPaths: readonly string[],
): string[] {
  const isRegistered = (deletedPath: string): boolean =>
    registeredPaths.some(
      (registered) => deletedPath === registered || deletedPath.startsWith(`${registered}/`),
    );

  return deletedPaths
    .filter((deletedPath) => !isRegistered(deletedPath))
    .map((deletedPath) => `登録外の削除を検出: ${deletedPath}`);
}

/** 破棄の道具自身の make ターゲットが `.mk` のマーカー除去で消えていることを確認する。 */
export function findLeftoverMakeTarget(makeHelpOutput: string): string[] {
  return makeHelpOutput.includes(SAMPLE_MAKE_TARGET)
    ? [`make ターゲット ${SAMPLE_MAKE_TARGET} が残っています`]
    : [];
}

/** 残留サンプル参照の grep 結果を失敗メッセージへ変換する。 */
export function findDanglingReferences(danglingHits: string): string[] {
  const hits = danglingHits.trim();

  return hits === "" ? [] : [`残留サンプル参照:\n${hits}`];
}

/** 検証に要る入力一式。すべて入口が集めて渡す。 */
export type VerificationInput = {
  registeredPaths: readonly string[];
  restoredPaths: readonly string[];
  pathExists: (relativePath: string) => boolean;
  gitStatusPorcelain: string;
  makeHelpOutput: string;
  danglingHits: string;
};

/** 5 種の検査をすべて走らせ、失敗メッセージを 1 本の配列にまとめる。 */
export function collectFailures(input: VerificationInput): string[] {
  return [
    ...findUnremovedPaths(input.registeredPaths, input.pathExists),
    ...findMissingRestorations(input.restoredPaths, input.pathExists),
    ...findUnregisteredDeletions(
      input.registeredPaths,
      parseDeletedPaths(input.gitStatusPorcelain),
    ),
    ...findLeftoverMakeTarget(input.makeHelpOutput),
    ...findDanglingReferences(input.danglingHits),
  ];
}

/**
 * 検証成功後に消す対象を返す。
 *
 * @remarks
 * このツールは破棄の最終地点なので、自身のディレクトリごと消えます。ファイルを 1 本ずつ挙げて
 * いると、判定モジュールやそのテストを足したときに列挙から漏れ、消えたはずの検証ツールの一部
 * だけが利用者のリポジトリへ居座ります。スナップショットは別の場所にあるため別に挙げます。
 */
export function selfDestructTargets(selfDir: string, snapshotPath: string): string[] {
  return [snapshotPath, selfDir];
}

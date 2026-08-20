// 使い捨ての作業ツリーの置き場所を決める。
//
// 見る対象は「落ちた実行が判定した木」なので、いま手元で編集している木とは別に要る。実体を
// tmp/ の下へ置くのは、そこが追跡から外れているため（`.gitignore`）。

/** 使い捨ての作業ツリーを生やす根。リポジトリルートからの相対。 */
export const REVIEW_ROOT = "tmp/review";

/** `git worktree list --porcelain` が作業ツリーの位置を載せる行の頭。 */
const WORKTREE_LINE = "worktree ";

/** ディレクトリ名として使えない文字。git の参照名に許される記号のうち、パスで意味を持つもの。 */
const UNSAFE = /[^A-Za-z0-9._-]+/g;

/**
 * ブランチ名を 1 階層のディレクトリ名へ畳む。
 *
 * @remarks
 * `/` を含むブランチ名をそのままパスへ入れると階層が増え、掃除の対象が呼び出しごとに変わります。
 * 畳んだ名前は一意ではありませんが、**同じブランチが必ず同じ名前へ落ちる**ので、繰り返し呼んでも
 * 作業ツリーは 1 つで済みます。
 *
 * @param branch - ブランチ名
 */
export function reviewSlug(branch: string): string {
  const slug = branch.replace(UNSAFE, "-").replace(/^-+|-+$/g, "");

  if (slug === "") {
    throw new Error(`ディレクトリ名にできないブランチ名です: ${branch}`);
  }

  return slug;
}

/**
 * 作業ツリーの位置。story と画面で分けるので、両方を同時に立てても衝突しない。
 *
 * @param kind - 見る対象（`vrt` / `e2e`）
 * @param branch - ブランチ名
 */
export function worktreePath(kind: string, branch: string): string {
  return `${REVIEW_ROOT}/${kind}/${reviewSlug(branch)}`;
}

/**
 * 登録済みの作業ツリーのうち、見直しで生やしたものだけを取り出す。
 *
 * @remarks
 * **接頭辞で絞ります。**登録の一覧には主リポジトリの作業ツリーも、他の目的で生やしたものも
 * 並ぶので、片付けが「登録されているものを全部外す」になると作業中の木を巻き込みます。
 *
 * @param porcelain - `git worktree list --porcelain` の出力
 * @param root - リポジトリルートの絶対パス
 */
export function reviewWorktrees(porcelain: string, root: string): string[] {
  const prefix = `${root}/${REVIEW_ROOT}/`;

  return porcelain
    .split("\n")
    .filter((line) => line.startsWith(WORKTREE_LINE))
    .map((line) => line.slice(WORKTREE_LINE.length).trim())
    .filter((tree) => tree.startsWith(prefix));
}

/**
 * git へそのまま渡してよい値か。
 *
 * @remarks
 * `-` で始まる値を git はオプションとして読みます。ブランチ名として受け取った文字列が
 * `--force` のように振る舞う余地を残さないため、渡す手前で弾きます。
 *
 * @param label - 弾いたときに出す入力の名前
 * @param value - 渡そうとしている値
 */
export function assertPlainArgument(label: string, value: string): void {
  if (value === "" || value.startsWith("-")) {
    throw new Error(`${label} の値が不正です: ${value === "" ? "(空)" : value}`);
  }
}

/**
 * カンマ区切りの一覧を解く。空白と空要素は落とし、重複は最初の 1 つだけ残す。
 *
 * @remarks
 * 順序は受け取ったままにします。CI の報告が並べた順で見られるようにするためです。
 *
 * @param value - カンマ区切りの文字列
 */
export function parseOnly(value: string): string[] {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");

  if (items.length === 0) {
    throw new Error("見る対象が空です。CI の報告が出した一覧をそのまま渡してください。");
  }

  return [...new Set(items)];
}

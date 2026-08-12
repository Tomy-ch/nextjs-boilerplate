/**
 * 基準画像のリポジトリで**残す**ものの宣言。
 *
 * @remarks
 * 掃除は取り消せません。残す条件をここ 1 箇所に理由つきで置くのは、削除側が独自の条件を
 * 持つと「なぜ消えたのか」が実行ログにしか残らず、消えた後では復元できないためです。
 *
 * 判定の実体は [plan.ts](plan.ts) が持ち、このモジュールはデータだけを持ちます。
 */

/**
 * 基準画像の置き場が持つ既定ブランチ。README だけを載せた**根のコミット**が居る。
 *
 * @remarks
 * 撮影した各コミットはこの根を親に持ちます。根を共有させるのは、GitHub の compare が
 * 無関係な履歴どうしを比較できないためです。掃除の対象からは常に外します。
 */
export const ROOT_BRANCH = "main";

/**
 * 撮影したコミットを指す ref の接頭辞。ref 名は `snapshot/<主リポジトリのブランチ名>`。
 *
 * @remarks
 * ブランチ名をそのまま使うので、`a` と `a/b` が同時に存在すると git の ref が衝突します。
 * ADR 0150 のブランチ命名では先頭区画が `feature` / `bugfix` / `hotfix` / `release` の
 * 閉じた集合で、その区画自体がブランチになることは無いため到達しません。**命名規約を
 * 緩めるときはここも見直すこと。**
 */
export const SNAPSHOT_REF_PREFIX = "snapshot/";

/**
 * 先端が指す基準画像を保持する、主リポジトリの ref。
 *
 * @remarks
 * ここに挙げた ref を checkout した人が、その場でサブモジュールを解決できることを保証します。
 * 保持しない ref から到達するコミットは消えるため、**過去のコミットへ遡ると基準画像は無い**
 * のが仕様です。
 *
 * - `production` / `staging` / `develop` — ADR 0150 が固定する常設ブランチ
 * - `release/*` / `hotfix/*` — リリース作業中に checkout される
 * - 開いている PR の head — 撮り直した本人がまだ見ている
 *
 * 撤去条件は、それぞれのブランチ運用が ADR 0150 から外れた時点。
 */
export const LIVE_BRANCH_PATTERNS = [
  "production",
  "staging",
  "develop",
  "release/*",
  "hotfix/*",
] as const;

/**
 * 保持するタグの本数（新しい順）。
 *
 * @remarks
 * タグは打った時点の木を再現するためのものですが、基準画像まで揃うのは直近だけです。
 * 古いタグを checkout して VRT を回す動機が無いため本数で切ります。
 *
 * 撤去条件は、過去のリリースに対して VRT を回す運用が生まれた時点。そのときは本数ではなく
 * 保持期間で切るか、掃除そのものをやめる判断になります。
 */
export const RETAINED_TAG_COUNT = 20;

/**
 * 掃除を促す閾値。超えたときだけ issue を立てる。
 *
 * @remarks
 * 報告が毎月来ると読まれなくなり、読まれない報告は無いのと同じです。**何もしなくてよい月は
 * 黙る**ことが条件です。
 *
 * - `removableRefs` — 消せる ref の本数。掃除の手間に見合う量
 * - `repositoryMiB` — 置き場の総量。GitHub が推奨する 1 GiB の半分で鳴らす
 *
 * 撤去条件は、鳴っても掃除しない月が続いた時点（閾値が実態と合っていない）。
 */
export const PRUNE_THRESHOLDS = {
  removableRefs: 20,
  repositoryMiB: 500,
} as const;

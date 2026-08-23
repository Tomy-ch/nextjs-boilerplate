// SAST が読むルール集合の固定。ここはデータだけを持ち、取得と検証は index.ts が担う。
//
// **なぜレジストリを引かないか。** `--config p/javascript` は semgrep.dev からルールを取る。
// あの集合は Semgrep Rules License v1.0 で、「自社内部の目的に限る」「再頒布不可」「サービスと
// して提供不可」を課す。エンジンを OSS fork の opengrep へ替えた判断（fork 先へライセンスの
// 判断を渡さない）は、ルールをレジストリから引いている限り成立しない —— 判断の所在が層を
// ずれただけになる。判断の全文は docs/adr/0110-security-operations.md が持つ。

/** ルールの供給元（GitHub のリポジトリ）。 */
export const RULES_REPO = "opengrep/opengrep-rules";

/**
 * 固定する commit。
 *
 * @remarks
 * moving な ref を書かないのは、action の SHA ピンや image の digest ピンと同じ理由です
 * （[0153](../../docs/adr/0153-ci-configuration.md) 3）。上げるときは
 * `pnpm exec tsx scripts/opengrep-rules --resolve` が新しい {@link RULES_DIGEST} を出します。
 */
export const RULES_COMMIT = "f1d2b562b414783763fd02a6ed2736eaed622efa";

/**
 * 取り出したルール集合の digest。
 *
 * @remarks
 * **アーカイブではなく、取り出した YAML そのものに対して取ります。** GitHub が自動生成する
 * tarball はバイト単位で不変ではなく（gzip の設定が変われば同じ commit でも digest が動く）、
 * アーカイブを照合対象にすると、中身が同じなのに落ちる日が来ます。照合したいのは
 * 「走らせるルールが固定したものと同じか」であって、包み方ではありません。
 */
export const RULES_DIGEST = "0dfbc521a0604b5388dd3988e5e55287833597c93e71d7425a805e0379e5973c";

/**
 * ルールを展開する先（リポジトリルート相対）。
 *
 * @remarks
 * **このパスは opengrep が付ける rule id の接頭辞になります**（`tmp.opengrep-rules.javascript.…`）。
 * code scanning の alert はその id で同定されるため、動かすと既存の alert が一斉に別物になり、
 * 解決済みのものが開き直します。動かすときはそれを承知で動かしてください。
 */
export const RULES_DIR = "tmp/opengrep-rules";

/**
 * 取り出す言語。
 *
 * @remarks
 * この 2 つだけを取るのは、置き場そのものが検体（意図的に脆弱なソース）をルールと同数だけ
 * 抱えているためです。`java/` や `php/` の検体には本物の webshell が含まれ、取り込めば
 * 開発者のマシンとランナーに置かれます。言語で絞り、さらに index.ts が YAML だけを取り出す
 * ことで、検体は 1 つもディスクへ出ません。
 */
export const RULES_LANGUAGES = ["javascript", "typescript"] as const;

/**
 * 取り出す分類。
 *
 * @remarks
 * `security/` だけを採り、その下の `audit/` は捨てます。**`audit` は「読んで判断するための
 * 所見」であって、ゲートに載る前提の分類ではありません** —— レジストリの `p/javascript` も
 * 既定では含めていません。実測でも、含めると 28 件（うち 23 件が `detect-non-literal-regexp`
 * と `detect-redos`）出て 0 件 baseline が保てませんでした。同じ規則を
 * [eslint.config.ts](../../eslint.config.ts) の security でも落としており、理由も同じです。
 */
export const RULES_CATEGORY = "security";

/** {@link RULES_CATEGORY} の下で捨てる分類。 */
export const RULES_EXCLUDED_CATEGORY = "audit";

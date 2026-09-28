/** `APP_ENV` が選べる環境。 */
export type ApplicationEnvironment = "local" | "ci" | "dev" | "stg" | "prd";

/** `APP_ENV` が選べる環境の一覧。 */
export const applicationEnvironments: readonly ApplicationEnvironment[] = [
  "local",
  "ci",
  "dev",
  "stg",
  "prd",
];

/**
 * `APP_ENV` が選べる環境のいずれかか。
 *
 * @param value - 検査する文字列
 * @returns 選べる {@link ApplicationEnvironment} のいずれかか
 */
function isApplicationEnvironment(value: string): value is ApplicationEnvironment {
  return applicationEnvironments.some((environment) => environment === value);
}

/**
 * `APP_ENV` に指定された環境を返す。指定が無ければ null。
 *
 * @remarks
 * **既定値へ落としません。** 環境を条件にして開発専用の口を閉じる判断も、同梱の秘密値を許す
 * 判断も、「未設定」を安全側へ倒せなければ意味を失います。既定値を返すと、`APP_ENV` を設定し
 * 忘れた実環境が `local` として扱われ、閉じたはずの口が開きます。
 *
 * @returns 指定された {@link ApplicationEnvironment}。未指定は null
 * @throws `APP_ENV` が選べる値でないとき
 */
export function findApplicationEnvironment(): ApplicationEnvironment | null {
  const applicationEnvironment = process.env["APP_ENV"];

  if (applicationEnvironment === undefined) {
    return null;
  }

  if (!isApplicationEnvironment(applicationEnvironment)) {
    throw new Error(
      `APP_ENV は ${applicationEnvironments.join(", ")} のいずれかを指定してください: ${applicationEnvironment}`,
    );
  }

  return applicationEnvironment;
}

/**
 * 開発専用の口を開ける環境。
 *
 * @remarks
 * ここに `dev` / `stg` / `prd` を足すと、**誰でも任意の役割の session を発行できる口**が実環境に
 * 開きます。判定を API の接続モードではなく環境そのものに置いているのは、接続モードが
 * 「mock を実環境に置かない」という散文の約束でしか守られていないためです。
 */
const developmentOnlyEnvironments: ReadonlySet<ApplicationEnvironment> = new Set(["local", "ci"]);

/**
 * 開発専用の口を開けてよい環境か。
 *
 * @remarks
 * **`APP_ENV` が指定されていることも要求します。** 未指定を既定値へ落とさない理由は
 * {@link findApplicationEnvironment} と同じです。
 *
 * 判定をここに置くのは、口が増えるたびに同じ条件が写るのを避けるためです。開ける環境の一覧が
 * 2 か所にあると、片方だけを広げた変更が黙って通ります。
 *
 * @returns 開発専用の口を開けてよいか
 */
export function isDevelopmentOnlyEndpointOpen(): boolean {
  const environment = findApplicationEnvironment();

  return environment !== null && developmentOnlyEnvironments.has(environment);
}

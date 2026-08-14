import path from "node:path";
import { config } from "dotenv";

const defaultApplicationEnvironment = "local";

/** `APP_ENV` が選べる環境。 */
export type ApplicationEnvironment = "local" | "ci" | "dev" | "stg" | "prd";

const applicationEnvironments: readonly ApplicationEnvironment[] = [
  "local",
  "ci",
  "dev",
  "stg",
  "prd",
];

let isLoaded = false;

/** `APP_ENV` が選択可能な環境名かを判定する。 */
function isApplicationEnvironment(value: string): value is ApplicationEnvironment {
  return applicationEnvironments.some((environment) => environment === value);
}

/**
 * `APP_ENV` に明示された環境を返す。指定が無ければ null。
 *
 * @remarks
 * **既定値へ落としません。** 環境を条件にして開発専用の口を閉じる判断は、「未設定」を安全側へ
 * 倒せなければ意味を失います。既定値を返す関数で判定すると、`APP_ENV` を設定し忘れた実環境が
 * `local` として扱われ、閉じたはずの口が開きます。
 *
 * ENV ファイルの選択（{@link loadEnvironment}）はこの結果を既定値で補って使います。読み込む
 * ファイルが無いのは起動できない状態であり、そちらは既定値がある方が正しいためです。
 *
 * @throws `APP_ENV` が選べる値でないとき
 */
export function findExplicitApplicationEnvironment(): ApplicationEnvironment | null {
  const applicationEnvironment = process.env.APP_ENV;

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
 * `APP_ENV` が示す `env/.env.<環境>` を一度だけ `process.env` へ読み込む。
 *
 * `override: false` により CI・PaaS が注入した値を常に優先する。`APP_ENV` の未指定時は
 * local を選ぶため、ローカルでは通常の `pnpm dev` / `pnpm build` だけで動作する。
 */
export function loadEnvironment(): void {
  if (isLoaded) {
    return;
  }

  const environmentPath = path.join(
    process.cwd(),
    "env",
    `.env.${findExplicitApplicationEnvironment() ?? defaultApplicationEnvironment}`,
  );
  const result = config({ path: environmentPath, override: false, quiet: true });
  if (result.error !== undefined) {
    throw new Error(`環境変数ファイルを読み込めません: ${environmentPath}`, {
      cause: result.error,
    });
  }

  isLoaded = true;
}

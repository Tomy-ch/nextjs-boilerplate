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
 * いま選択されている環境を返す。
 *
 * @remarks
 * ENV ファイルの選択と同じ規則で解きます。環境を条件にする判断（開発専用の口を閉じる等）が
 * 独自に `APP_ENV` を読むと、既定値や綴りの解釈が 2 通りに分かれます。
 *
 * @throws `APP_ENV` が選べる値でないとき
 */
export function getApplicationEnvironment(): ApplicationEnvironment {
  const applicationEnvironment = process.env.APP_ENV ?? defaultApplicationEnvironment;

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

  const environmentPath = path.join(process.cwd(), "env", `.env.${getApplicationEnvironment()}`);
  const result = config({ path: environmentPath, override: false, quiet: true });
  if (result.error !== undefined) {
    throw new Error(`環境変数ファイルを読み込めません: ${environmentPath}`, {
      cause: result.error,
    });
  }

  isLoaded = true;
}

import path from "node:path";
import { config } from "dotenv";

const defaultApplicationEnvironment = "local";
const applicationEnvironments = ["local", "ci", "dev", "stg", "prd"] as const;

type ApplicationEnvironment = (typeof applicationEnvironments)[number];

let isLoaded = false;

/** `APP_ENV` が選択可能な環境名かを判定する。 */
function isApplicationEnvironment(value: string): value is ApplicationEnvironment {
  return applicationEnvironments.includes(value as ApplicationEnvironment);
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

  const applicationEnvironment = process.env.APP_ENV ?? defaultApplicationEnvironment;
  if (!isApplicationEnvironment(applicationEnvironment)) {
    throw new Error(
      `APP_ENV は ${applicationEnvironments.join(", ")} のいずれかを指定してください: ${applicationEnvironment}`,
    );
  }

  const environmentPath = path.join(process.cwd(), "env", `.env.${applicationEnvironment}`);
  const result = config({ path: environmentPath, override: false, quiet: true });
  if (result.error !== undefined) {
    throw new Error(`環境変数ファイルを読み込めません: ${environmentPath}`, {
      cause: result.error,
    });
  }

  isLoaded = true;
}

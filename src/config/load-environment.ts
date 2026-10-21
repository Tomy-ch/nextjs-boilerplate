import path from "node:path";
import { config } from "dotenv";

import { applicationEnvironments, findApplicationEnvironment } from "./application-environment";

let isLoaded = false;

/**
 * `APP_ENV` が示す `env/.env.<環境>` を一度だけ `process.env` へ読み込む。
 *
 * @remarks
 * `override: false` により CI・PaaS が注入した値を常に優先します。
 *
 * **指定を要求します。** 既定を持つと、設定を忘れた実環境が同梱の `env/.env.local` を読み、
 * 注入し忘れた変数だけが手元向けの値で埋まった状態で起動します。開発の入口（`pnpm dev` /
 * `pnpm storybook`）は script が `local` を渡すため、clone 直後はそのまま動きます。
 *
 * @throws `APP_ENV` が未指定のとき / 指す ENV ファイルを読めないとき
 */
export function loadEnvironment(): void {
  if (isLoaded) {
    return;
  }

  const applicationEnvironment = findApplicationEnvironment();

  if (applicationEnvironment === null) {
    throw new Error(
      `APP_ENV を指定してください: ${applicationEnvironments.join(", ")}（例: APP_ENV=local）`,
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

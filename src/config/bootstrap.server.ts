import "server-only";

import { loadEnvironment } from "./load-environment";

/**
 * Node.js server instance の起動時に Config を初期化する。
 *
 * ファイルから ENV を読み込んだ後、server Config の module を評価する。
 * 各 singleton は `getEnvironment()` の結果を共有するため、この経路での全 ENV 検証はプロセスごとに一度だけ行われる。
 */
export async function bootstrapConfig(): Promise<void> {
  loadEnvironment();
  await import("./validate-environment.server");
}

import type { NextConfig } from "next";

import { validateEnvironment } from "./src/config/environment";
import { loadEnvironment } from "./src/config/load-environment";

/**
 * Next.js の build / 開発サーバー初期化時に ENV を読み込み、全量検証してから設定を返す。
 */
const nextConfig = async (): Promise<NextConfig> => {
  loadEnvironment();
  validateEnvironment();

  return {
    /* config options here */
  };
};

export default nextConfig;

import type { NextConfig } from "next";

import { getEnvironment, validateEnvironment } from "./src/config/environment";
import { loadEnvironment } from "./src/config/load-environment";

/**
 * Next.js の build / 開発サーバー初期化時に ENV を読み込み、全量検証してから設定を返す。
 */
const nextConfig = async (): Promise<NextConfig> => {
  loadEnvironment();
  validateEnvironment();

  const mediaOrigin = new URL(getEnvironment().MEDIA_ORIGIN);

  return {
    images: {
      // 配信元は環境ごとに変わるため、許可も検証済みの ENV から組み立てる。ここへ直接書くと
      // 環境変数と設定の 2 か所が別々に動き、片方だけ直した状態を作れる。
      //
      // ワイルドカードは使わない。許可した host は Next.js の画像最適化が任意のパスを取りに
      // 行ける相手であり、範囲を広げるとそのまま外部リクエストの踏み台になる。
      remotePatterns: [
        {
          protocol: mediaOrigin.protocol === "https:" ? "https" : "http",
          hostname: mediaOrigin.hostname,
          port: mediaOrigin.port,
          pathname: "/**",
        },
      ],
    },
  };
};

export default nextConfig;

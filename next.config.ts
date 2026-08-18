import type { NextConfig } from "next";

import { getEnvironment, validateEnvironment } from "./src/config/environment";
import { isDevelopmentOnlyEndpointOpen, loadEnvironment } from "./src/config/load-environment";

/** すべての環境で route として扱う拡張子。 */
const ROUTE_EXTENSIONS = ["tsx", "ts"];

/**
 * 開発専用の route が名乗る拡張子。
 *
 * @remarks
 * `page.dev.tsx` / `route.dev.ts` は、開発と CI の build にしか含まれません。実行時の判定
 * （`isDevelopmentAccessAllowed()`）と二重にしているのは、**残っていない**ことと**開かない**ことが
 * 別の保証だからです。build から外れていれば、設定を誤って `APP_ENV` を取り違えても、その成果物に
 * 面そのものが存在しません。
 */
const DEVELOPMENT_ROUTE_EXTENSIONS = ["dev.tsx", "dev.ts"];

/**
 * Next.js の build / 開発サーバー初期化時に ENV を読み込み、全量検証してから設定を返す。
 */
const nextConfig = async (): Promise<NextConfig> => {
  loadEnvironment();
  validateEnvironment();

  const mediaOrigin = new URL(getEnvironment().MEDIA_ORIGIN);

  return {
    // `APP_ENV` が明示されていない build も開発ではない側へ倒す。判定は
    // `isDevelopmentOnlyEndpointOpen()` が持ち、実行時の判定と同じ 1 つの条件を見る。
    pageExtensions: isDevelopmentOnlyEndpointOpen()
      ? [...DEVELOPMENT_ROUTE_EXTENSIONS, ...ROUTE_EXTENSIONS]
      : ROUTE_EXTENSIONS,
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

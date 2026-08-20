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
 * 要求本体のうち、送るファイル以外が占めるぶんの余裕。
 *
 * @remarks
 * 中継の上限が押さえるのは**ファイルの大きさ**で、要求本体はそれに multipart の境界・ヘッダ・
 * 項目のメタデータが加わったものです。同値にすると上限ちょうどのファイルがこの差だけ超えて
 * 落ちるため、封筒のぶんを足します。Next.js は目安として 10〜20 KB を挙げており、その上端から
 * 2 の冪で 1 段上を取ります。
 */
const REQUEST_ENVELOPE_BYTES = 32 * 1024;

/**
 * Next.js の build / 開発サーバー初期化時に ENV を読み込み、全量検証してから設定を返す。
 */
const nextConfig = async (): Promise<NextConfig> => {
  loadEnvironment();
  validateEnvironment();

  const environment = getEnvironment();
  const mediaOrigin = new URL(environment.MEDIA_ORIGIN);

  return {
    // `APP_ENV` が明示されていない build も開発ではない側へ倒す。判定は
    // `isDevelopmentOnlyEndpointOpen()` が持ち、実行時の判定と同じ 1 つの条件を見る。
    pageExtensions: isDevelopmentOnlyEndpointOpen()
      ? [...DEVELOPMENT_ROUTE_EXTENSIONS, ...ROUTE_EXTENSIONS]
      : ROUTE_EXTENSIONS,
    experimental: {
      serverActions: {
        // 上限の出所は env の 1 行で、ここは封筒のぶんを足すだけにする。単位付きの文字列で
        // 書き直すと同じ閾値が 2 か所に現れ、片方だけ動かせる状態になる。
        //
        // **この上限は全 Server Action へ及ぶ。** action ごとの指定を Next.js は持たないため、
        // ファイルを受ける口のために上げた値が、テキストしか受け取らない口にも同じ上限で効く。
        // 受け入れられないなら受け口を Route Handler へ寄せる（[0075](docs/adr/0075-file-upload-seam.md)）。
        bodySizeLimit: environment.NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES + REQUEST_ENVELOPE_BYTES,
      },
    },
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

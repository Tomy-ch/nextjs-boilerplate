import "server-only";

import { getEnvironment } from "../environment";
import type { SiteEnvironment } from "./site.schema";

class SiteConfig {
  readonly #publicOrigin: string;
  readonly #indexable: "off" | "on";

  private constructor(publicOrigin: string, indexable: "off" | "on") {
    this.#publicOrigin = publicOrigin;
    this.#indexable = indexable;
  }

  /** 検証済み ENV から production singleton を組み立てる。 */
  static fromValues(values: SiteEnvironment): SiteConfig {
    return new SiteConfig(values.SITE_PUBLIC_ORIGIN, values.SITE_INDEXABLE);
  }

  /**
   * 外から見たこのサイトの origin（scheme + host + port、パス無し）。
   *
   * @remarks
   * 絶対 URL を要る metadata（canonical / sitemap / OG 画像）はすべてここへ経路を足して組み立て
   * ます。要求の `Host` から採らないのは、配信面（CDN / ロードバランサ）を挟むと要求が名乗る
   * host が公開名と一致しなくなり、他人を指す canonical を配ることになるためです。
   */
  get publicOrigin(): string {
    return this.#publicOrigin;
  }

  /** 検索エンジンに索引させてよいか。 */
  get isIndexable(): boolean {
    return this.#indexable === "on";
  }
}

let siteConfig: SiteConfig | undefined;

/**
 * 公開面の設定を供給する、プロセス内で不変な singleton を返す。
 *
 * @remarks
 * **build 時にも読まれます。** 静的に描かれる画面の metadata と `robots.txt` はプリレンダーに
 * 焼き込まれるため、`pnpm build` と `pnpm start` に同じ値を渡します。配信物は環境ごとに build する
 * 前提です（[env/README.md](../../../env/README.md)）。
 */
export function getSiteConfig(): SiteConfig {
  siteConfig ??= SiteConfig.fromValues(getEnvironment());
  return siteConfig;
}

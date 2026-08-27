import { RepositoryLinks } from "../repository-links/repository-links";

/**
 * 利用者向け画面のフッター。
 *
 * @remarks
 * 器が 2 つ（`(shop)` と `(site-info)`）あるため、中身はここが 1 つだけ持ちます。器ごとに書くと、
 * 文言を直した人が片方だけを直せてしまい、通った画面によって足元の表示が変わります。
 *
 * admin の器には出しません。見せる相手が違います。
 */
export function SiteFooter() {
  return (
    <div className="flex flex-col gap-3">
      <p>Next.js / React のプレゼンテーション層 boilerplate です。</p>
      <RepositoryLinks />
    </div>
  );
}

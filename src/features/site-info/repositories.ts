/** このサイトを構成しているリポジトリ 1 つ分。 */
export type Repository = {
  readonly name: string;
  readonly url: string;
  /** フッターの補足に載せる 1 文。 */
  readonly summary: string;
  /** このサイトについて のカードに載せる説明。 */
  readonly description: string;
};

/**
 * このサイトを構成しているリポジトリ。
 *
 * @remarks
 * フッターの導線と「このサイトについて」のカードが同じ表を読みます。別々に持つと、片方だけ
 * 名前や URL が古いまま残ります。
 */
export const REPOSITORIES: readonly Repository[] = [
  {
    name: "nextjs-boilerplate",
    url: "https://github.com/Tomy-ch/nextjs-boilerplate",
    summary: "このサイトそのもの。画面と操作の実装一式です。",
    description:
      "このサイトそのものです。Next.js と React で作られていて、画面・入力フォーム・カート・認証の往復といった、利用者が触る部分の実装が入っています。この題材の EC サイトは、その実装を一通り並べて見せるために用意したものです。",
  },
  {
    name: "go-boilerplate",
    url: "https://github.com/Tomy-ch/go-boilerplate",
    summary: "このサイトが繋いでいるバックエンド。商品・購入・ユーザーの API です。",
    description:
      "このサイトが繋いでいるバックエンドです。Go で作られていて、商品・購入・ユーザーの API を提供します。手元で両方を動かすと、商品を探してから購入するまでの流れを通しで試せます。",
  },
];

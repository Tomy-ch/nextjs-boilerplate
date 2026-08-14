import { AlertTriangleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/design-system/status/alert/alert";

/**
 * このサイトについての説明。
 *
 * @remarks
 * トップの断り書きは「実在の取引と取り違えられない」ことだけを担い、短く保っています。ここは
 * その続きで、**何のためのサイトか・何が動かないか・使った結果に誰が責任を負うか**を書きます。
 *
 * 免責を最後ではなく独立した見出しで置くのは、末尾の小さな注記にすると読まれないためです。
 */
export function AboutView() {
  return (
    <div className="flex max-w-3xl flex-col gap-8 text-sm leading-relaxed">
      <Alert variant="warning">
        <AlertTriangleIcon />
        <AlertTitle>サンプルサイトです</AlertTitle>
        <AlertDescription>
          <p>掲載している商品・企業・価格・在庫はすべて架空で、実在しません。</p>
        </AlertDescription>
      </Alert>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">何のためのサイトか</h2>
        <p>
          Next.js / React のプレゼンテーション層 boilerplate のデモです。boilerplate が備えている
          画面の型・データ取得の境界・エラーの扱い・アクセシビリティの水準を、実際に触って
          確かめられる形で並べてあります。EC の題材を選んでいるのは、一覧・詳細・カート・
          フォーム・認証・権限といった要素が一通り出てくるためで、EC を作ることが目的では
          ありません。
        </p>
        <p>
          同じ作者の Go 製バックエンド boilerplate と繋ぐと、商品の取得から購入までの一連の
          流れを通しで試せます。繋がない場合はモックが応答するため、単体でも画面は動きます。
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">動かないもの</h2>
        <p>
          購入と決済は成立しません。注文しても商品は届かず、請求も発生しません。メールの送信、
          問い合わせ、配送状況の追跡も動きません。表示される日時・件数・金額は、いずれも
          デモ用に用意した値です。
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">免責</h2>
        <p>
          このサイトおよび boilerplate のコードは現状のまま提供されます。
          <strong>利用した結果として生じたいかなる損害についても、作者は責任を負いません。</strong>
          動作の正確性・完全性・特定の目的への適合性についても保証しません。
        </p>
        <p>
          コードを自分の用途へ持ち込む場合は、そのまま本番で使えるものとしてではなく、判断の
          出発点として扱ってください。
        </p>
      </section>
    </div>
  );
}

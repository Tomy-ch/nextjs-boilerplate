import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { HomePageContent } from "@/features/home/page-content";
import { SampleNotice } from "@/features/home/ui/sample-notice/sample-notice";
import { HomeSkeleton } from "@/features/home/ui/skeleton/skeleton";

export const metadata: Metadata = {
  title: "トップ",
  description: "新着商品と売れ筋ランキング、カテゴリから商品を探せます。",
};

/**
 * リクエストごとに描く。
 *
 * @remarks
 * 動的な API を使わない画面なので、宣言しなければ build 時に 1 度だけ描かれます。並ぶのは
 * 新着とランキングで、どちらもバックエンドの状態が変われば変わる値です。build 時に固めると
 * 更新が反映されず、そのうえ build にバックエンドへの到達性を要求します
 * （[0040](../../../docs/adr/0040-routing-rendering-strategy.md)。モードは画面ごとに選ぶもので、
 * ここでの宣言は boilerplate 全体の既定ではありません）。
 */
export const dynamic = "force-dynamic";

/**
 * トップ。
 *
 * @remarks
 * 取得も組み立ても持ちません。route と feature をつなぐだけの薄い層です
 * （[0040](../../../docs/adr/0040-routing-rendering-strategy.md)）。
 *
 * 断り書きは見出しより前、かつ `Suspense` の外に置きます。取得を待って出すと、待っている間は
 * 普通の EC に見えます。読み始める前に目に入る位置でなければ、書いた意味が薄れます。
 *
 * `Suspense` を中身の全体に掛けています。節ごとに分けると節の数だけ枠が入れ替わり、上から
 * 順に読み始めた位置が下へずれていきます。3 系統は同時に取得しており、待つ時間は最も遅い
 * 1 つ分なので、まとめて待たせても増える待ち時間はありません。
 */
export default function HomePage() {
  return (
    <ContentContainer className="py-8">
      <SampleNotice />
      <PageHeader>
        <div>
          <PageHeaderTitle>ようこそ</PageHeaderTitle>
          <PageHeaderDescription>
            新着商品と売れ筋ランキング、カテゴリから商品を探せます。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<HomeSkeleton />}>
        <HomePageContent />
      </Suspense>
    </ContentContainer>
  );
}

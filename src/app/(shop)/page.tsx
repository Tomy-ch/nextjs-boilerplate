import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { HomeCategoriesContent } from "@/features/home/categories-content";
import { HomePageContent } from "@/features/home/page-content";
import { SampleNotice } from "@/features/home/ui/sample-notice/sample-notice";
import { HomeSkeleton } from "@/features/home/ui/skeleton/skeleton";

export const metadata: Metadata = {
  title: "トップ",
  description: "新着商品と売れ筋ランキング、カテゴリから商品を探せます。",
  alternates: { canonical: "/" },
};

/**
 * トップ。
 *
 * @remarks
 * 断り書きは見出しより前、かつ `Suspense` の外に置きます。取得を待って出すと、待っている間は
 * 普通の EC に見えます。読み始める前に目に入る位置でなければ、書いた意味が薄れます。
 *
 * **`Suspense` は 1 つだけです。** 枠が入れ替わる回数が節の数だけ増えると、上から順に読み始めた
 * 位置が下へずれていきます。要求ごとに取る 2 系統は同時に取得しており、待つ時間は最も遅い 1 つ分
 * なので、まとめて待たせても増える待ち時間はありません。
 *
 * **分類はその外に置きます**（[categories-content.tsx](../../features/home/categories-content.tsx)）。
 * 枠が増えるわけではないので、上のまとめる理由とは衝突しません。
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
      <div className="space-y-10 py-4">
        <Suspense fallback={<HomeSkeleton />}>
          <HomePageContent />
        </Suspense>
        <HomeCategoriesContent />
      </div>
    </ContentContainer>
  );
}

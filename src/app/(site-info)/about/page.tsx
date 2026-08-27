import type { Metadata } from "next";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { AboutView } from "@/features/site-info/about/view";

/**
 * build 時に 1 度だけ描く。
 *
 * @remarks
 * 描く内容の出所がコードだけなので固めます。器も何も読みません（`../layout.tsx`）。宣言と実態は
 * build の成果物と突き合わせます（`scripts/render-mode`）。
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "このサイトについて",
  description: "このサイトが何のためのもので、何が動かないかを説明します。",
};

/**
 * このサイトについて。
 *
 * @remarks
 * 保護の対象にしません。何のためのサイトかと免責は、ログインする前に読めなければ意味を
 * 持ちません。
 */
export default function AboutPage() {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>このサイトについて</PageHeaderTitle>
          <PageHeaderDescription>
            このサイトが何のためのもので、何が動かないかを説明します。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <AboutView />
    </ContentContainer>
  );
}

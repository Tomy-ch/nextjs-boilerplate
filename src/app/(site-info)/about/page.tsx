import type { Metadata } from "next";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { AboutView } from "@/features/site-info/about/view";

export const metadata: Metadata = {
  title: "このサイトについて",
  description: "このサイトが何のためのもので、何が動かないかを説明します。",
  alternates: { canonical: "/about" },
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

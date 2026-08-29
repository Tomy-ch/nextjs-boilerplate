import type { Metadata } from "next";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { TermsView } from "@/features/site-info/terms/view";

export const metadata: Metadata = {
  title: "利用規約",
  description: "このサイトを閲覧・利用するうえで同意していただく内容です。",
  alternates: { canonical: "/terms" },
};

/**
 * 利用規約。
 *
 * @remarks
 * 保護の対象にしません。閲覧した時点で同意とみなす以上、ログインする前に読めなければ成立
 * しません。
 */
export default function TermsPage() {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>利用規約</PageHeaderTitle>
          <PageHeaderDescription>
            このサイトを閲覧・利用するうえで同意していただく内容です。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <TermsView />
    </ContentContainer>
  );
}

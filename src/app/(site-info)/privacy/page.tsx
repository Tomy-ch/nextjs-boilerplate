import type { Metadata } from "next";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { PrivacyView } from "@/features/site-info/privacy/view";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "入力した情報がどこに保存されるかを、起動のしかたごとに説明します。",
  alternates: { canonical: "/privacy" },
};

/**
 * プライバシーポリシー。
 *
 * @remarks
 * 保護の対象にしません。情報の保存先は、入力する前に読めなければ意味を持ちません。
 */
export default function PrivacyPage() {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>プライバシーポリシー</PageHeaderTitle>
          <PageHeaderDescription>
            入力した情報がどこに保存されるかを、起動のしかたごとに説明します。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <PrivacyView />
    </ContentContainer>
  );
}

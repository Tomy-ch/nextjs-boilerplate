import type { Metadata } from "next";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { PrivacyView } from "@/features/site-info/privacy/view";

/**
 * build 時に 1 度だけ描く。
 *
 * @remarks
 * 描く内容の出所がコードだけなので固めます。器も何も読みません（`../layout.tsx`）。宣言と実態は
 * build の成果物と突き合わせます（`scripts/render-mode`）。
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "入力した情報がどこに保存されるかを、起動のしかたごとに説明します。",
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

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactElement } from "react";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { toSafeReturnUrl } from "@/model/return-url";

import { PREFECTURES } from "../account.fixture";
import { OnboardingView } from "./view";

const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-00000000000f";

/**
 * route と同じ器で包む。
 *
 * @remarks
 * ナビゲーションも脇の領域も置きません。この画面を開いている利用者はまだ利用者の記録を持たず、
 * 出しても行ける先が無いためです（`(auth)` の layout）。見出しは route segment が持つので、
 * ここでも同じ位置に置きます。
 */
function withPageFrame(Story: () => ReactElement) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppShell navItems={[]} siteName="nextjs-boilerplate">
        <ContentContainer className="py-8">
          <PageHeader>
            <div>
              <PageHeaderTitle>登録</PageHeaderTitle>
              <PageHeaderDescription>
                はじめての利用に必要な情報を登録します。登録が終わると、購入や購入履歴の確認ができます。
              </PageHeaderDescription>
            </div>
          </PageHeader>
          <Story />
        </ContentContainer>
      </AppShell>
    </div>
  );
}

const meta = {
  title: "Page/Account/Onboarding",
  component: OnboardingView,
  args: {
    idempotencyKey: IDEMPOTENCY_KEY,
    prefectures: PREFECTURES,
    returnUrl: toSafeReturnUrl("/mypage"),
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 900 },
      description: {
        component: [
          "登録（オンボーディング）です。認証は済んでいるが利用者の記録がまだ無い主体だけが",
          "開けます。**登録はカタログでは動きません** —— 送信先は Server Action です。",
        ].join(""),
      },
    },
  },
  decorators: [withPageFrame],
} satisfies Meta<typeof OnboardingView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。PC 幅で、最初の段だけが見える。 */
export const Default: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット幅。進捗の並びと横並びの組が縦へ落ちる境界を見る。 */
export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ幅。進捗・入力・操作がすべて 1 列で収まるかを見る。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

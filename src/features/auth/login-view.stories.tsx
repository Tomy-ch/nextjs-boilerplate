import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AppShell } from "@/components/shell/app-shell/app-shell";

import { toSafeReturnUrl } from "@/model/return-url";

import { LOGIN_NOTICE } from "./facade/login-notice";
import { LoginView } from "./login-view";

/**
 * route と同じ器で包む。`(auth)/layout.tsx` はナビゲーションを持たない shell を置くので、
 * story 側でもそれを再現しないと、余白と重心が実物とずれる。
 */
const meta = {
  title: "Features/Auth/LoginView",
  component: LoginView,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <AppShell siteName="nextjs-boilerplate" navItems={[]}>
        <Story />
      </AppShell>
    ),
  ],
} satisfies Meta<typeof LoginView>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 直接ログイン画面へ来た場合。認証後はトップへ戻る。 */
export const Default: Story = {
  args: { returnUrl: toSafeReturnUrl("/"), notice: null },
};

/** 保護された画面で弾かれて来た場合。認証後は元の画面へ戻る。 */
export const WithReturnUrl: Story = {
  args: { returnUrl: toSafeReturnUrl("/account"), notice: null },
};

/** IdP へ到達できず戻された場合。理由と、もう一度押せることが操作の手前で読めるかを見る。 */
export const Unavailable: Story = {
  args: { returnUrl: toSafeReturnUrl("/account"), notice: LOGIN_NOTICE.UNAVAILABLE },
};

/**
 * 狭い幅。カードが画面幅いっぱいまで縮み、ボタンの押しやすさが保たれることを見る。案内を出した
 * 状態で見るのは、この画面で最も長い文がそこにあり、あふれるならここだからである。
 */
export const Mobile: Story = {
  args: { returnUrl: toSafeReturnUrl("/"), notice: LOGIN_NOTICE.UNAVAILABLE },
  globals: { viewport: { value: "mobile1" } },
};

import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AppShell } from "@/components/shell/app-shell/app-shell";

import { toSafeReturnUrl } from "@/model/return-url";

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
  args: { returnUrl: toSafeReturnUrl("/") },
};

/** 保護された画面で弾かれて来た場合。認証後は元の画面へ戻る。 */
export const WithReturnUrl: Story = {
  args: { returnUrl: toSafeReturnUrl("/mypage") },
};

/** 狭い幅。カードが画面幅いっぱいまで縮み、ボタンの押しやすさが保たれることを見る。 */
export const Mobile: Story = {
  args: { returnUrl: toSafeReturnUrl("/") },
  globals: { viewport: { value: "mobile1" } },
};

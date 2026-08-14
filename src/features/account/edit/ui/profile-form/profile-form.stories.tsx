import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { ToastProvider } from "@/components/shell/toaster/toaster";

import { PREFECTURES, PROFILE } from "../../../account.fixture";
import { ProfileForm } from "./profile-form";

/**
 * 検証に落ちた状態まで進める。
 *
 * @remarks
 * 検証は focus が外れた時点で走るため、値を書き換えたうえで別の項目へ移します。props では
 * 到達できない状態で、操作を経ないと出ません。
 *
 * 3 種類を混ぜるのは、必須・形式・桁数のどれも同じ見た目で出るかを 1 つの story で見るためです。
 */
async function showValidationErrors({
  canvasElement,
}: {
  canvasElement: HTMLElement;
}): Promise<void> {
  const canvas = within(canvasElement);

  await userEvent.clear(canvas.getByLabelText("姓"));
  await userEvent.tab();

  const email = canvas.getByLabelText("メールアドレス");
  await userEvent.clear(email);
  await userEvent.type(email, "not-an-email");
  await userEvent.tab();

  const phone = canvas.getByLabelText("電話番号");
  await userEvent.clear(phone);
  await userEvent.type(phone, "0901");
  await userEvent.tab();
}

const meta = {
  title: "Features/Account/ProfileForm",
  component: ProfileForm,
  decorators: [
    // 保存の成功を伝えるのが toast であり、実物では root layout がこの Provider を持つ。
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          "プロフィールの入力欄です。検証は submit 時、以後は誤りのあった項目だけを変更のたびに見ます。",
          "**保存はカタログでは動きません** —— 送信先は Server Action です。",
          "確かめられるのは配置と、検証が出す文言までです。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof ProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。全項目が埋まっている。 */
export const Default: Story = {
  args: { prefectures: PREFECTURES, profile: PROFILE },
};

/** 任意入力が空の場合。建物名だけが空欄で始まる。 */
export const WithoutBuilding: Story = {
  args: { prefectures: PREFECTURES, profile: { ...PROFILE, building: null } },
};

/**
 * 契約の上限いっぱいの値。姓名 50 / メール 100 / 市区町村 100 / 丁目番地 200 / 建物名 200 で、
 * 入力欄が横へ広がらず値が収まるかを見る。
 */
export const MaxLength: Story = {
  args: {
    prefectures: PREFECTURES,
    profile: {
      ...PROFILE,
      firstName: "太".repeat(50),
      lastName: "山".repeat(50),
      city: "渋".repeat(100),
      street: "神宮前".repeat(66),
      building: "パークサイドレジデンス".repeat(18),
    },
  },
};

/**
 * 検証に落ちた状態。必須・形式・桁数の 3 種類が同時に出る。項目名を主語にした文言と、
 * 赤くなる範囲（label・入力欄・文言）を見る。
 */
export const ValidationErrors: Story = {
  args: { prefectures: PREFECTURES, profile: PROFILE },
  play: showValidationErrors,
};

/** 検証に落ちた状態をスマホ幅で。文言が入力欄の幅で折り返しても、次の項目と混ざらないかを見る。 */
export const ValidationErrorsMobile: Story = {
  args: { prefectures: PREFECTURES, profile: PROFILE },
  globals: { viewport: { value: "mobile2", isRotated: false } },
  play: showValidationErrors,
};

/** タブレット幅。横並びにしていた組が縦へ落ちる境界を見る。 */
export const Tablet: Story = {
  args: { prefectures: PREFECTURES, profile: PROFILE },
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ幅。すべての項目が 1 列になる。 */
export const Mobile: Story = {
  args: { prefectures: PREFECTURES, profile: PROFILE },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

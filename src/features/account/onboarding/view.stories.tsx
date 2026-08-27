import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactElement } from "react";
import { userEvent, within } from "storybook/test";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { toSafeReturnUrl } from "@/model/return-url";

import { PREFECTURES, PROFILE } from "../account.fixture";
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

/** 基本情報の段を埋める。 */
async function fillBasics(canvas: ReturnType<typeof within>): Promise<void> {
  await userEvent.type(canvas.getByLabelText("名字"), PROFILE.lastName);
  await userEvent.type(canvas.getByLabelText("名前"), PROFILE.firstName);
  await userEvent.type(canvas.getByLabelText("メールアドレス"), PROFILE.email);
  await userEvent.type(canvas.getByLabelText("電話番号"), PROFILE.phone);
}

/** 次の段へ進む。 */
async function goNext(canvas: ReturnType<typeof within>, label = "次へ"): Promise<void> {
  await userEvent.click(canvas.getByRole("button", { name: label }));
}

/** 住所の段まで進める。 */
async function showAddressStep({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> {
  const canvas = within(canvasElement);

  await fillBasics(canvas);
  await goNext(canvas);
}

/** 住所を引くところまで進める。引ける番号は story ごとに変える。 */
async function searchAddress(canvasElement: HTMLElement, postalCode: string): Promise<void> {
  const canvas = within(canvasElement);

  await fillBasics(canvas);
  await goNext(canvas);
  await userEvent.type(canvas.getByLabelText("郵便番号"), postalCode);
  await userEvent.click(canvas.getByRole("button", { name: "住所を検索" }));
  await canvas.findByText(/補完しました|見つかりませんでした|使えません/);
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
          "住所の補完は `150-0001`（町域が割れる）と `220-0012`（町域まで定まる）が引け、",
          "`000-0000` は補完の機構が動いていない場合、それ以外は該当なしになります。",
        ].join(""),
      },
    },
  },
  decorators: [withPageFrame],
} satisfies Meta<typeof OnboardingView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。開いた直後は基本情報の段だけが見え、埋まるまで次へは押せない。 */
export const Default: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 住所の段。郵便番号の枠の中に検索の操作を持つ。 */
export const AddressStep: Story = {
  play: showAddressStep,
};

/** 確認の段。任意入力の建物名だけが空で、送る内容を読み返せる。 */
export const ConfirmStepFilled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await fillBasics(canvas);
    await goNext(canvas);
    await userEvent.type(canvas.getByLabelText("郵便番号"), PROFILE.postalCode);
    await userEvent.selectOptions(canvas.getByLabelText("都道府県"), PROFILE.prefecture);
    await userEvent.type(canvas.getByLabelText("市区町村"), PROFILE.city);
    await userEvent.type(canvas.getByLabelText("丁目・番地"), PROFILE.street);
    await goNext(canvas, "確認へ進む");
  },
};

/** 住所を補完した状態。候補が割れた町域は埋めず、一致した都道府県と市区町村だけが入る。 */
export const AddressCompleted: Story = {
  play: ({ canvasElement }) => searchAddress(canvasElement, "150-0001"),
};

/** 候補が 1 つに定まる場合。丁目・番地が空なので町域まで埋まる。 */
export const AddressCompletedToTown: Story = {
  play: ({ canvasElement }) => searchAddress(canvasElement, "220-0012"),
};

/** 該当が無い場合。郵便番号を直せば埋まるので、検索の操作は残る。 */
export const AddressNotFound: Story = {
  play: ({ canvasElement }) => searchAddress(canvasElement, "999-9999"),
};

/** 補完の機構が動いていない場合。何度引いても埋まらないので検索の操作を閉じ、手入力へ促す。 */
export const AddressUnavailable: Story = {
  play: ({ canvasElement }) => searchAddress(canvasElement, "000-0000"),
};

/**
 * 検証に落ちた状態。必須・形式の誤りが focus を外した時点で出る。
 *
 * @remarks
 * 最後は焦点を移さずに外します。`tab()` で次の項目へ移すと、主題ではない focus ring が絵に
 * 残り、その角の aa が実行ごとに揺れます。検証に要るのは焦点が外れることだけです。
 */
export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByLabelText("名字"));
    await userEvent.tab();

    const email = canvas.getByLabelText("メールアドレス");

    await userEvent.type(email, "not-an-email");
    email.blur();
  },
};

/** タブレット幅。横並びにしていた名字と名前が縦へ落ちる境界を見る。 */
export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
  play: showAddressStep,
};

/** スマホ幅。進捗・入力・操作がすべて 1 列で収まるかを見る。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  play: showAddressStep,
};

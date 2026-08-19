import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { toSafeReturnUrl } from "@/model/return-url";

import { PREFECTURES, PROFILE } from "../../../account.fixture";
import { RegistrationForm } from "./registration-form";

const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-00000000000f";

/** 基本情報の段を埋める。 */
async function fillBasics(canvas: ReturnType<typeof within>): Promise<void> {
  await userEvent.type(canvas.getByLabelText("姓"), PROFILE.lastName);
  await userEvent.type(canvas.getByLabelText("名"), PROFILE.firstName);
  await userEvent.type(canvas.getByLabelText("メールアドレス"), PROFILE.email);
  await userEvent.type(canvas.getByLabelText("電話番号"), PROFILE.phone);
}

/** 住所の段を埋める。 */
async function fillAddress(canvas: ReturnType<typeof within>): Promise<void> {
  await userEvent.type(canvas.getByLabelText("郵便番号"), PROFILE.postalCode);
  await userEvent.selectOptions(canvas.getByLabelText("都道府県"), PROFILE.prefecture);
  await userEvent.type(canvas.getByLabelText("市区町村"), PROFILE.city);
  await userEvent.type(canvas.getByLabelText("丁目・番地"), PROFILE.street);
}

/** 次の段へ進む。 */
async function goNext(canvas: ReturnType<typeof within>): Promise<void> {
  await userEvent.click(canvas.getByRole("button", { name: "次へ" }));
}

/** 住所の段まで進める。 */
async function showAddressStep({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> {
  const canvas = within(canvasElement);

  await fillBasics(canvas);
  await goNext(canvas);
}

/** 住所を補完する。引ける番号は story ごとに変える。 */
async function searchAddress(canvasElement: HTMLElement, postalCode: string): Promise<void> {
  const canvas = within(canvasElement);

  await fillBasics(canvas);
  await goNext(canvas);
  await userEvent.type(canvas.getByLabelText("郵便番号"), postalCode);
  await userEvent.click(canvas.getByRole("button", { name: "住所を検索" }));
  await canvas.findByText(/補完しました|見つかりませんでした|使えません/);
}

const meta = {
  title: "Features/Account/RegistrationForm",
  component: RegistrationForm,
  args: {
    idempotencyKey: IDEMPOTENCY_KEY,
    prefectures: PREFECTURES,
    returnUrl: toSafeReturnUrl("/mypage"),
  },
  parameters: {
    docs: {
      description: {
        component: [
          "登録の入力欄です。基本情報・住所・確認の 3 段に分かれ、**送信は最後の段で 1 回だけ**",
          "行われます（表示していない段も DOM に残るため）。**登録は成功したことにして返します。**",
          "住所の補完は `150-0001`（町域が割れる）と `220-0012`（町域まで定まる）が引け、",
          "`000-0000` は補完の機構が動いていない場合、それ以外は該当なしになります。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof RegistrationForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。開いた直後は基本情報の段だけが見える。 */
export const Default: Story = {};

/** 住所の段。郵便番号の枠の中に検索の操作を持つ。 */
export const AddressStep: Story = {
  play: showAddressStep,
};

/**
 * 確認の段。入力が足りないまま進んだ場合で、**進む操作を塞がない代わりにここで名指しする**。
 */
export const ConfirmStepIncomplete: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await goNext(canvas);
    await goNext(canvas);
  },
};

/** 確認の段。すべて埋めた状態で、送る内容を読み返せる。 */
export const ConfirmStepFilled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await fillBasics(canvas);
    await goNext(canvas);
    await fillAddress(canvas);
    await goNext(canvas);
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

/**
 * 補完の機構が動いていない場合。何度引いても埋まらないので検索の操作を閉じ、手入力へ促す。
 */
export const AddressUnavailable: Story = {
  play: ({ canvasElement }) => searchAddress(canvasElement, "000-0000"),
};

/** 検証に落ちた状態。必須・形式の誤りが focus を外した時点で出る。 */
export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByLabelText("姓"));
    await userEvent.tab();
    await userEvent.type(canvas.getByLabelText("メールアドレス"), "not-an-email");
    await userEvent.tab();
  },
};

/** タブレット幅。横並びにしていた姓名が縦へ落ちる境界を見る。 */
export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
  play: showAddressStep,
};

/** スマホ幅。進捗と操作の並びが 1 列で収まるかを見る。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  play: showAddressStep,
};

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { mocked, userEvent, within } from "storybook/test";

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState } from "@/model/action-state";
import { neverSettlingAction } from "~catalog/lib/pending-action";

import { claimCouponAction } from "../../../actions";
import { ClaimForm } from "./claim-form";

/**
 * コードを入れて受け取るまで進める。
 *
 * @param code - 入れるコード
 * @returns story の `play` へ渡す関数
 */
function claim(code: string) {
  return async ({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText("キャンペーンコード"), code);
    await userEvent.click(canvas.getByRole("button", { name: "受け取る" }));
  };
}

const meta = {
  title: "Features/Coupons/Wallet/ClaimForm",
  component: ClaimForm,
  parameters: {
    docs: {
      description: {
        component: [
          "キャンペーンコードの受け取り欄です。**受け取りは成功したことにして返します。** 本物は",
          "成立すると一覧を取り直しますが、カタログに取り直す先は無く、toast と入力の片付けまでが",
          "確かめられる範囲です。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof ClaimForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {};

/** 空のまま押した。送らずに、入力を促す文言を入力欄に紐づけて出す。 */
export const EmptySubmitted: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "受け取る" }));
  },
};

/** 受け取りが成立した。入力が片付き、toast で知らせる。 */
export const Claimed: Story = {
  play: claim("WELCOME-2026"),
};

/** 送信中。文言を保ったまま、操作の印だけを差し替える。 */
export const Pending: Story = {
  beforeEach: () => {
    mocked(claimCouponAction).mockImplementation(() =>
      neverSettlingAction().then(() => idleActionState()),
    );
  },
  play: claim("WELCOME-2026"),
};

/** 受け取れないコード。理由を区別しない 1 つの文言を、入力欄に紐づけて出す。 */
export const Rejected: Story = {
  beforeEach: () => {
    mocked(claimCouponAction).mockResolvedValue(
      failedActionState({
        fieldErrors: { code: ["このコードでは受け取れません。コードを確かめてください。"] },
        kind: ErrorKind.VALIDATION,
      }),
    );
  },
  play: claim("NOT-A-CODE"),
};

/** 受け取りが処理中と返った（409）。結果が分かるまでコードを書き換えさせず、同じコードでの送り直しを促す。 */
export const InProgress: Story = {
  beforeEach: () => {
    mocked(claimCouponAction).mockResolvedValue(
      failedActionState({
        formError:
          "受け取りの処理が終わっていません。少し待ってから一覧を確かめ、もう一度お試しください。",
        kind: ErrorKind.CONFLICT,
      }),
    );
  },
  play: claim("WELCOME-2026"),
};

/** 一時的に受け取れない。結果が分かるまでコードを書き換えさせない。 */
export const Unavailable: Story = {
  beforeEach: () => {
    mocked(claimCouponAction).mockResolvedValue(
      failedActionState({
        formError: "現在サービスを利用できません。しばらくしてから再試行してください。",
        kind: ErrorKind.UNAVAILABLE,
      }),
    );
  },
  play: claim("WELCOME-2026"),
};

/** 解けない送信。入力を直しても通らないので、読み込み直しへ導く。 */
export const Malformed: Story = {
  beforeEach: () => {
    mocked(claimCouponAction).mockResolvedValue(
      failedActionState({
        formError: "受け取りを受け付けられませんでした。画面を読み込み直してください。",
      }),
    );
  },
  play: claim("WELCOME-2026"),
};

/** スマホ幅。入力欄と操作を縦に積む。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

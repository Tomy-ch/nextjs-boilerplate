import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";
import { ADMIN_CAMPAIGN_LIST_PATH } from "../../../../paths";
import { OffsetPagination } from "../../../../ui/offset-pagination/offset-pagination";
import { SUSPEND_CONFLICT_MESSAGE, type SuspendCampaignAction } from "../../form-state";
import { ADMIN_CAMPAIGN_ROWS } from "../../list.fixture";
import { toCampaignListHref } from "../../query";
import { SuspendableCampaignList } from "./suspendable-list";

/** canvas では送らない。押した先で何も起きないことを、待ち続けない形で示す。 */
const idle: SuspendCampaignAction = () => Promise.resolve(idleActionState());

/** 停止が成立した状態を作る。 */
const succeeding: SuspendCampaignAction = () =>
  Promise.resolve(succeededActionState({ code: "SPRING2026" }));

/** 既に停止されていて拒まれた状態を作る。 */
const rejecting: SuspendCampaignAction = () =>
  Promise.resolve(
    failedActionState({
      formError: `SPRING2026 は${SUSPEND_CONFLICT_MESSAGE}`,
      kind: ErrorKind.CONFLICT,
    }),
  );

/**
 * 行の操作 menu を開いてから「停止する」を選び、確認の中の送信まで押す。
 *
 * menu も dialog も portal で `body` の側へ出るため、canvas の内側からは辿れない。
 */
async function suspend(canvasElement: HTMLElement) {
  const body = within(document.body);

  await userEvent.click(within(canvasElement).getByRole("button", { name: "SPRING2026 の操作" }));
  await userEvent.click(await body.findByRole("menuitem", { name: "停止する" }));

  const dialog = await body.findByRole("alertdialog");

  await userEvent.click(within(dialog).getByRole("button", { name: "停止する" }));
}

const meta = {
  title: "Features/Admin/Campaigns/List/SuspendableList",
  component: SuspendableCampaignList,
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: ADMIN_CAMPAIGN_LIST_PATH } },
    docs: {
      story: { inline: false, iframeHeight: 640 },
      description: {
        component: [
          "停止の始まりと終わりを繋ぐ層です。行・確認の面・結果の報せは別々の部品にあり、**どれとどれが同じ相手の話かを知っているのはここだけ**です。",
          "冪等キーは確認を開くたびに作り直します。確認は成否によらず閉じ、結果は一覧の上に残ります。",
        ].join(""),
      },
    },
  },
  args: {
    items: ADMIN_CAMPAIGN_ROWS,
    suspendAction: idle,
    pagination: (
      <OffsetPagination
        hrefOf={(page) => toCampaignListHref({ page })}
        label="キャンペーン一覧のページ送り"
        page={1}
        pageCount={4}
      />
    ),
  },
} satisfies Meta<typeof SuspendableCampaignList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** まだ何も送っていない状態。報せの領域は場所を取らない。 */
export const Default: Story = {};

/** 停止が成立した状態。確認は閉じ、何が起きたかは一覧の上に残る。 */
export const Suspended: Story = {
  args: { suspendAction: succeeding },
  play: async ({ canvasElement }) => {
    await suspend(canvasElement);
  },
};

/** 既に停止されていて拒まれた状態。確認は同じく閉じ、拒まれた理由が一覧の上に残る。 */
export const Conflicted: Story = {
  args: { suspendAction: rejecting },
  play: async ({ canvasElement }) => {
    await suspend(canvasElement);
  },
};

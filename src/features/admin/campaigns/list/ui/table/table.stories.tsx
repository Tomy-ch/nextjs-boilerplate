import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, userEvent, within } from "storybook/test";
import { toPageLinks } from "../../../../page-window";
import { ADMIN_CAMPAIGN_LIST_PATH } from "../../../../paths";
import { OffsetPagination } from "../../../../ui/offset-pagination/offset-pagination";
import {
  ADMIN_CAMPAIGN_ROWS,
  LONG_CODE_CAMPAIGN_ROW,
  SUSPENDED_CAMPAIGN_ROWS,
} from "../../list.fixture";
import { toCampaignListHref } from "../../query";
import { AdminCampaignTable } from "./table";

const meta = {
  title: "Features/Admin/Campaigns/List/Table",
  component: AdminCampaignTable,
  parameters: {
    layout: "padded",
    nextjs: { navigation: { pathname: ADMIN_CAMPAIGN_LIST_PATH } },
    docs: {
      description: {
        component: [
          "管理側のキャンペーン一覧です。取得もページ送りの組み立ても持たず、並べる行と下へ置くものを受け取るだけです。",
          "**確認を出すのはここではありません** —— 行が知っているのは「このキャンペーンに対して停止が選ばれた」ことだけです。",
          "状態は文字のバッジで示し、配りきった行には「上限到達」の語を添えます。狭い段ではコード・状態・残り枚数・操作だけを残し、",
          "配るクーポンの有効期限と停止日時は広い段でだけ出します。",
        ].join(""),
      },
    },
  },
  args: {
    items: ADMIN_CAMPAIGN_ROWS,
    onSuspend: fn(),
    pagination: (
      <OffsetPagination
        label="キャンペーン一覧のページ送り"
        links={toPageLinks(1, 4, (page) => toCampaignListHref({ page }))}
      />
    ),
  },
} satisfies Meta<typeof AdminCampaignTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 4 つの状態と配りきった行が混ざった並び。状態の列と残り枚数の列で見分けられる。 */
export const Default: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット。日時の 2 列を伏せ、期間・値引き・適用範囲までを残す。 */
export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** 狭い段。コード・状態・残り枚数・操作だけを残す。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** キャンペーンが 1 件も無い状態。表の形は保ったまま、無いことだけを伝える。 */
export const Empty: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { items: [] },
};

/** 停止済みだけの並び。もう一度停止する意味が無いので、操作の trigger ごと出さない。 */
export const SuspendedOnly: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { items: SUSPENDED_CAMPAIGN_ROWS },
};

/** 長いコード。表は自分の領域の中で折り返し、画面そのものは横へあふれない。 */
export const LongCode: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { items: [LONG_CODE_CAMPAIGN_ROW, ...ADMIN_CAMPAIGN_ROWS.slice(0, 2)] },
};

/** 行の操作を開いた状態。停止していない行には停止だけが並ぶ。 */
export const RowActionsOpen: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "SPRING2026 の操作" }));
  },
};

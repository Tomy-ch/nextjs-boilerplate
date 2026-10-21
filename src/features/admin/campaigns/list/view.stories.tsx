import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { userEvent, within } from "storybook/test";

import { Button } from "@/components/design-system/action/button/button";
import { AdminShell } from "@/components/shell/admin-shell/admin-shell";
import type { AdminShellNavGroup } from "@/components/shell/admin-shell/admin-shell.definition";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";

import {
  ADMIN_CAMPAIGN_LIST_PATH,
  ADMIN_DASHBOARD_PATH,
  ADMIN_PRODUCT_LIST_PATH,
  ADMIN_USER_LIST_PATH,
} from "../../paths";
import { AdminScreenError } from "../../ui/error-state/error-state";
import { OffsetPagination } from "../../ui/offset-pagination/offset-pagination";
import { SUSPEND_CONFLICT_MESSAGE, type SuspendCampaignAction } from "./form-state";
import {
  ADMIN_CAMPAIGN_ROWS,
  LONG_CODE_CAMPAIGN_ROW,
  SUSPENDED_CAMPAIGN_ROWS,
} from "./list.fixture";
import { toCampaignListHref } from "./query";
import type { AdminCampaignRow } from "./row";
import { AdminCampaignListSkeleton } from "./ui/skeleton/skeleton";
import { SuspendableCampaignList } from "./ui/suspendable-list/suspendable-list";
import { AdminCampaignListView } from "./view";

const NAV_GROUPS: readonly AdminShellNavGroup[] = [
  { label: "集計", items: [{ href: ADMIN_DASHBOARD_PATH, label: "ダッシュボード" }] },
  { label: "商品", items: [{ href: ADMIN_PRODUCT_LIST_PATH, label: "商品一覧管理" }] },
  { label: "利用者", items: [{ href: ADMIN_USER_LIST_PATH, label: "利用者一覧" }] },
  { label: "販促", items: [{ href: ADMIN_CAMPAIGN_LIST_PATH, label: "キャンペーン一覧" }] },
];

/** 停止を試みる相手。fixture の先頭の、配布前の行。 */
const TARGET_CODE = "SPRING2026";

/** canvas では送らない。押した先で何も起きないことを、待ち続けない形で示す。 */
const idle: SuspendCampaignAction = () => Promise.resolve(idleActionState());

/** 停止が成立した状態を作る。 */
const succeeding: SuspendCampaignAction = () =>
  Promise.resolve(succeededActionState({ code: TARGET_CODE }));

/**
 * 停止が拒まれた状態を作る。
 *
 * @param formError - 一覧の上に出す文言
 * @param kind - 失敗の分類
 */
const rejecting =
  (formError: string, kind: ErrorKind): SuspendCampaignAction =>
  () =>
    Promise.resolve(failedActionState({ formError, kind }));

/** route と同じ器で包む。`admin/layout.tsx` の shell を再現する。 */
function withShell(Story: () => ReactElement) {
  return (
    <AdminShell
      consoleName="管理"
      headerActions={
        <Button asChild size="sm" variant="outline">
          <Link href="/products">ユーザー画面へ</Link>
        </Button>
      }
      homeHref={ADMIN_DASHBOARD_PATH}
      navGroups={NAV_GROUPS}
      siteHref="/"
      siteName="nextjs-boilerplate"
    >
      <Story />
    </AdminShell>
  );
}

/** `page.tsx` が置く見出しと読み幅。 */
function PageBody({ children }: { children: ReactNode }) {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>キャンペーン一覧</PageHeaderTitle>
          <PageHeaderDescription>
            クーポンを配るキャンペーンの配布状況を確認し、配布を停止します。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      {children}
    </ContentContainer>
  );
}

/** 一覧本体を組み立てる。story ごとに差し替えるのは行・ページ位置・送信先の 3 つだけ。 */
function list({
  items = ADMIN_CAMPAIGN_ROWS,
  page = 1,
  pageCount = 4,
  suspendAction = idle,
}: {
  items?: readonly AdminCampaignRow[];
  page?: number;
  pageCount?: number;
  suspendAction?: SuspendCampaignAction;
} = {}) {
  return (
    <SuspendableCampaignList
      items={items}
      pagination={
        <OffsetPagination
          hrefOf={(target) => toCampaignListHref({ page: target })}
          label="キャンペーン一覧のページ送り"
          page={page}
          pageCount={pageCount}
        />
      }
      suspendAction={suspendAction}
    />
  );
}

/**
 * 行の操作 menu を開いてから「停止する」を選ぶ。
 *
 * menu も dialog も portal で `body` の側へ出るため、canvas の内側からは辿れない。
 */
async function openSuspendDialog(canvasElement: HTMLElement) {
  const body = within(document.body);

  await userEvent.click(
    within(canvasElement).getByRole("button", { name: `${TARGET_CODE} の操作` }),
  );
  await userEvent.click(await body.findByRole("menuitem", { name: "停止する" }));
  await body.findByRole("alertdialog");
}

/** 確認の中の送信を押す。同じ呼び名の menu 項目と取り違えないよう dialog の内側へ絞る。 */
async function submitSuspend() {
  const dialog = await within(document.body).findByRole("alertdialog");

  await userEvent.click(within(dialog).getByRole("button", { name: "停止する" }));
}

/**
 * 停止の確認を開いて送る。
 *
 * @param canvasElement - story の canvas
 */
async function suspend({ canvasElement }: { canvasElement: HTMLElement }) {
  await openSuspendDialog(canvasElement);
  await submitSuspend();
}

const meta = {
  title: "Page/Admin/Campaigns/List",
  component: AdminCampaignListView,
  parameters: {
    docs: {
      story: { inline: false, iframeHeight: 760 },
      description: {
        component: [
          "管理側のキャンペーン一覧です。**canvas では遷移も取得も起きません** —— ページ送りを操作しても表が",
          "変わらないのはそのためです。状態（停止・配布前・配布中・期間外）は行ごとに「いま」と突き合わせて決まり、",
          "停止済み以外の行から配布を停止できます。停止は取り消せないので確認を挟み、結果は一覧の上に残ります。",
        ].join(""),
      },
    },
    layout: "fullscreen",
    nextjs: { navigation: { pathname: ADMIN_CAMPAIGN_LIST_PATH } },
  },
  decorators: [withShell],
  render: (args) => (
    <PageBody>
      <AdminCampaignListView {...args} />
    </PageBody>
  ),
  args: { children: list() },
} satisfies Meta<typeof AdminCampaignListView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 4 つの状態と配りきった行が混ざった並び。停止済みの行にだけ操作が出ない。 */
export const Default: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット。日時の 2 列を伏せ、期間・値引き・適用範囲までを残す。 */
export const DefaultTablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ。コード・状態・残り枚数・操作だけを残す。 */
export const DefaultMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** キャンペーンが 1 件も無い状態。表の形は保ったまま、無いことだけを伝える。 */
export const Empty: Story = {
  args: { children: list({ items: [], pageCount: 1 }) },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 取得を待っている状態。配布期間の補足は待たずに出て、表の形だけが枠で並ぶ。 */
export const Loading: Story = {
  args: { children: <AdminCampaignListSkeleton /> },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 取得に失敗した状態。`/admin` の error 境界が見出しごと置き換え、器だけが残る。 */
export const FetchError: Story = {
  render: () => (
    <ContentContainer className="py-8">
      <AdminScreenError message={getDefaultErrorMeta(ErrorKind.INTERNAL).message} />
    </ContentContainer>
  ),
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 途中のページ。前後のどちらへも進め、離れた範囲は省略記号で畳まれる。 */
export const MiddlePage: Story = {
  args: { children: list({ page: 5, pageCount: 12 }) },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 末尾のページ。次が無いので「次へ」は押せない。 */
export const LastPage: Story = {
  args: { children: list({ items: SUSPENDED_CAMPAIGN_ROWS, page: 4, pageCount: 4 }) },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** ページが 1 枚しかない状態。前後のどちらも押せないまま位置は保たれる。 */
export const SinglePage: Story = {
  args: { children: list({ pageCount: 1 }) },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 行ごとの操作を開いた状態。停止していない行には停止だけが並ぶ。 */
export const RowActionsOpen: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: `${TARGET_CODE} の操作` }),
    );
  },
};

/** 停止の確認を開いた状態。取り消せないことと、配ったクーポンは無効にならないことを先に書く。 */
export const SuspendConfirm: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await openSuspendDialog(canvasElement);
  },
};

/** 停止が成立した状態。確認は閉じ、何が起きたかは一覧の上に残る。 */
export const Suspended: Story = {
  args: { children: list({ suspendAction: succeeding }) },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: suspend,
};

/** 既に停止されていて拒まれた状態（409）。確認は閉じ、拒まれた理由が一覧の上に残る。 */
export const SuspendConflicted: Story = {
  args: {
    children: list({
      suspendAction: rejecting(`${TARGET_CODE} は${SUSPEND_CONFLICT_MESSAGE}`, ErrorKind.CONFLICT),
    }),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: suspend,
};

/** 停止の送信がそのほかの理由で失敗した状態。分類ごとの既定の文言が一覧の上に残る。 */
export const SuspendFailed: Story = {
  args: {
    children: list({
      suspendAction: rejecting(
        getDefaultErrorMeta(ErrorKind.UNAVAILABLE).message,
        ErrorKind.UNAVAILABLE,
      ),
    }),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: suspend,
};

/** 長いコード。表は自分の領域の中で折り返し、画面そのものは横へあふれない。 */
export const LongCode: Story = {
  args: {
    children: list({ items: [LONG_CODE_CAMPAIGN_ROW, ...ADMIN_CAMPAIGN_ROWS.slice(0, 2)] }),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

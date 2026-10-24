import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import { type ComponentProps, type ReactNode, useCallback, useState } from "react";
import { userEvent, within } from "storybook/test";
import { Button } from "@/components/design-system/action/button/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/design-system/navigation/breadcrumb/breadcrumb";
import { AdminShell } from "@/components/shell/admin-shell/admin-shell";
import type { AdminShellNavGroup } from "@/components/shell/admin-shell/admin-shell.definition";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";
import { neverSettlingAction } from "~catalog/lib/pending-action";

import { ADMIN_PRODUCT_LIST_PATH, ADMIN_USER_LIST_PATH } from "../../paths";
import {
  BLOCKED_IMPACT,
  DISCONTINUE_PRODUCT,
  DISCONTINUE_RESULT,
  DISCONTINUED_AT,
  LONG_NAME_DISCONTINUE_PRODUCT,
  OPEN_IMPACT,
  REMAINING_PURCHASES,
  UNTOUCHED_IMPACT,
} from "./discontinue.fixture";
import { DISCONTINUE_CONFLICT_MESSAGE, type DiscontinueProductState } from "./form-state";
import {
  DiscontinueRemainingPurchases,
  type RemainingPurchasesState,
} from "./ui/remaining-purchases/remaining-purchases";
import { AdminProductDiscontinueView, type DiscontinueStanding } from "./view";

const NAV_GROUPS: readonly AdminShellNavGroup[] = [
  { label: "商品", items: [{ href: ADMIN_PRODUCT_LIST_PATH, label: "商品一覧管理" }] },
  { label: "利用者", items: [{ href: ADMIN_USER_LIST_PATH, label: "利用者一覧" }] },
];

const RELOAD_HREF = `${ADMIN_PRODUCT_LIST_PATH}/${DISCONTINUE_PRODUCT.id}/discontinue`;

/** canvas で冪等キーとして載せる値。送信は起きないので固定でよい。 */
const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-a000-000000000001";

const OPEN: DiscontinueStanding = { kind: "open", impact: OPEN_IMPACT };
const BLOCKED: DiscontinueStanding = { kind: "open", impact: BLOCKED_IMPACT };
const DISCONTINUED: DiscontinueStanding = { kind: "discontinued", discontinuedAt: DISCONTINUED_AT };

/**
 * 残っている購入の区画を、取得を経ずに組む。
 *
 * @param state - 区画の読み込みの状態
 * @returns 区画の要素
 */
function remaining(state: RemainingPurchasesState): ReactNode {
  return <DiscontinueRemainingPurchases reloadHref={RELOAD_HREF} state={state} />;
}

/** canvas では送らない。押した先で何も起きないことを、待ち続けない形で示す。 */
const idle = () => Promise.resolve<DiscontinueProductState>(idleActionState());

/** 終わらない送信先。送信中の姿を留める。 */
const pending = () => neverSettlingAction().then(idle);

/**
 * 送信の結果を固定で返す送信先を作る。
 *
 * @param state - 返す結果
 * @returns 送信先
 */
function returning(state: DiscontinueProductState) {
  return () => Promise.resolve(state);
}

/** route と同じ器で包む。`admin/layout.tsx` の shell と `page.tsx` の見出し・階層を再現する。 */
function withPageFrame(Story: () => React.ReactElement) {
  return (
    <AdminShell
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={ADMIN_PRODUCT_LIST_PATH}>商品一覧管理</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{DISCONTINUE_PRODUCT.name}</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>廃番</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      consoleName="管理"
      headerActions={
        <Button asChild size="sm" variant="outline">
          <Link href="/products">ユーザー画面へ</Link>
        </Button>
      }
      homeHref={ADMIN_PRODUCT_LIST_PATH}
      navGroups={NAV_GROUPS}
      siteHref="/"
      siteName="nextjs-boilerplate"
    >
      <ContentContainer className="py-8">
        <PageHeader>
          <div>
            <PageHeaderTitle>商品の廃番</PageHeaderTitle>
            <PageHeaderDescription>
              影響を確かめてから、代替クーポンの条件を決めて廃番にします。廃番は取り消せません。
            </PageHeaderDescription>
          </div>
        </PageHeader>
        <Story />
      </ContentContainer>
    </AdminShell>
  );
}

/** `RefetchingView` の props。 */
type RefetchingViewProps = ComponentProps<typeof AdminProductDiscontinueView> & {
  /** 送信が返す結果。 */
  outcome: DiscontinueProductState;
  /** 送信先が取り直させた後の立ち位置。 */
  standingAfter: DiscontinueStanding;
  /** 取り直した後に並ぶ、残っている購入の区画。 */
  remainingAfter?: ReactNode;
};

/**
 * 送信先が画面を取り直させる流れを、canvas の中で再現する。
 *
 * @remarks
 * 本物では送信先が `revalidatePath` で取り直させ、届いた props だけが差し替わります。ここでは送信の
 * 中で立ち位置を差し替え、island が作り直されずに結果を持ち続けることを見せます。
 */
function RefetchingView({
  outcome,
  remainingAfter = null,
  standingAfter,
  ...props
}: RefetchingViewProps) {
  const [standing, setStanding] = useState(props.standing);
  const [remainingPurchases, setRemainingPurchases] = useState(props.remainingPurchases);
  const action = useCallback(() => {
    setStanding(standingAfter);
    setRemainingPurchases(remainingAfter);

    return Promise.resolve(outcome);
  }, [outcome, remainingAfter, standingAfter]);

  return (
    <AdminProductDiscontinueView
      {...props}
      discontinueAction={action}
      remainingPurchases={remainingPurchases}
      standing={standing}
    />
  );
}

/**
 * 条件を打つ。
 *
 * @param canvasElement - story の canvas
 * @param rate - 値引き率
 * @param days - 有効日数
 */
async function typeConditions(canvasElement: HTMLElement, rate: string, days: string) {
  const canvas = within(canvasElement);

  await userEvent.type(canvas.getByLabelText(/値引き率/), rate);
  await userEvent.type(canvas.getByLabelText(/有効日数/), days);
}

/**
 * 条件を打って確認を開く。
 *
 * @param canvasElement - story の canvas
 */
async function openConfirmation(canvasElement: HTMLElement) {
  await typeConditions(canvasElement, "10", "30");
  await userEvent.click(within(canvasElement).getByRole("button", { name: "廃番にする" }));
  await within(document.body).findByRole("alertdialog");
}

/** 確認の中の送信を押す。同じ呼び名の操作が外にも居るので、dialog の内側へ絞る。 */
async function submitDiscontinue() {
  const dialog = await within(document.body).findByRole("alertdialog");

  await userEvent.click(within(dialog).getByRole("button", { name: "廃番にする" }));
}

const meta = {
  title: "Page/Admin/Products/Discontinue",
  component: AdminProductDiscontinueView,
  parameters: {
    docs: {
      story: { inline: false, iframeHeight: 820 },
      description: {
        component: [
          "商品を廃番にする画面です。**canvas では送信も取り直しも起きません**（取り直しを見せる story は、",
          "送信の中で立ち位置を差し替えて再現しています）。見積もりは読み込んだ時点の値で、実行の結果とは",
          "一致しないことがあります。値引き率の範囲は画面では止めず、契約が 422 で拒みます。",
        ].join(""),
      },
    },
    layout: "fullscreen",
    nextjs: { navigation: { pathname: RELOAD_HREF } },
  },
  decorators: [withPageFrame],
  args: {
    product: DISCONTINUE_PRODUCT,
    standing: OPEN,
    remainingPurchases: null,
    discontinueAction: idle,
    idempotencyKey: IDEMPOTENCY_KEY,
  },
} satisfies Meta<typeof AdminProductDiscontinueView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 開いた直後。見積もりと、既定値を置かない条件の欄が並ぶ。 */
export const Default: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット。 */
export const DefaultTablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ。見積もりの数は縦に積まれる。 */
export const DefaultMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** どのカートにも入っていない商品。数は 0 のまま出し、クーポンが出ないことを添える。 */
export const NoImpact: Story = {
  args: { standing: { kind: "open", impact: UNTOUCHED_IMPACT } },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 進行中の購入が残っている商品。実行の入口は出さず、残っている購入を並べる。 */
export const InProgressRemaining: Story = {
  args: {
    standing: BLOCKED,
    remainingPurchases: remaining({ status: "ready", items: REMAINING_PURCHASES, partial: false }),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 並べた購入が全件ではない状態。並んでいないものがあることを添える。 */
export const InProgressPartial: Story = {
  args: {
    standing: BLOCKED,
    remainingPurchases: remaining({
      status: "ready",
      items: REMAINING_PURCHASES.slice(0, 2),
      partial: true,
    }),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 残っている購入を読めなかった状態。見積もりは残し、その場所だけで伝える。 */
export const RemainingUnavailable: Story = {
  args: { standing: BLOCKED, remainingPurchases: remaining({ status: "failed" }) },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 条件を打って確認を開いた状態。戻せないことと、カートとクーポンに起きることを先に書く。 */
export const Confirming: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await openConfirmation(canvasElement);
  },
};

/** 送信中。確認は開いたまま留まる。 */
export const Submitting: Story = {
  args: {
    discontinueAction: pending,
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await openConfirmation(canvasElement);
    await submitDiscontinue();
  },
};

/** 条件が読めない状態。確認を開かず、欄のそばに指摘が出る。 */
export const InvalidCondition: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await typeConditions(canvasElement, "10%", "0");
    await userEvent.click(within(canvasElement).getByRole("button", { name: "廃番にする" }));
  },
};

/** 接続先が値引き率を拒んだ状態（範囲外）。確認の中に出し、欄にも同じ指摘が付く。 */
export const RejectedCondition: Story = {
  args: {
    discontinueAction: returning(
      failedActionState({
        formError: null,
        fieldErrors: {
          couponDiscountRate: ["値引き率は受け付けられませんでした。入力し直してください。"],
        },
        kind: ErrorKind.VALIDATION,
      }),
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await openConfirmation(canvasElement);
    await submitDiscontinue();
  },
};

/**
 * 見積もりの後に進行中の購入が入って拒まれた状態。
 *
 * 確認は閉じ、取り直した見積もりと残っている購入の上に、拒まれた理由が出る。
 */
export const Conflicted: Story = {
  render: (args) => (
    <RefetchingView
      {...args}
      outcome={failedActionState({
        formError: DISCONTINUE_CONFLICT_MESSAGE,
        kind: ErrorKind.CONFLICT,
      })}
      remainingAfter={remaining({ status: "ready", items: REMAINING_PURCHASES, partial: false })}
      standingAfter={BLOCKED}
    />
  ),
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await openConfirmation(canvasElement);
    await submitDiscontinue();
  },
};

/** 一時的に受け付けられない状態。確認は開いたまま、中に理由が出る。 */
export const Unavailable: Story = {
  args: {
    discontinueAction: returning(
      failedActionState({
        formError: "現在サービスを利用できません。しばらくしてから再試行してください。",
        kind: ErrorKind.UNAVAILABLE,
      }),
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await openConfirmation(canvasElement);
    await submitDiscontinue();
  },
};

/** 一時的に受け付けられなかった確認を閉じた状態。結果が分かるまで条件を書き換えさせず、理由を条件の欄に結ぶ。 */
export const UnavailableLocked: Story = {
  args: {
    discontinueAction: returning(
      failedActionState({
        formError: "現在サービスを利用できません。しばらくしてから再試行してください。",
        kind: ErrorKind.UNAVAILABLE,
      }),
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await openConfirmation(canvasElement);
    await submitDiscontinue();

    const dialog = within(document.body).getByRole("alertdialog");

    await within(dialog).findByText(/現在サービスを利用できません/);
    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));
  },
};

/**
 * 廃番が成立した状態。
 *
 * 確認は閉じ、取り直した画面は廃番済みの姿になる。その上に実行の応答の数（見積もりとは異なる）が残る。
 */
export const Discontinued: Story = {
  render: (args) => (
    <RefetchingView
      {...args}
      outcome={succeededActionState(DISCONTINUE_RESULT)}
      standingAfter={{
        kind: "discontinued",
        discontinuedAt: new Date(DISCONTINUE_RESULT.discontinuedAt),
      }}
    />
  ),
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await openConfirmation(canvasElement);
    await submitDiscontinue();
  },
};

/** 既に廃番の商品を開いた状態。見積もりも実行の入口も出さない。 */
export const AlreadyDiscontinued: Story = {
  args: { standing: DISCONTINUED },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 契約上の最大長を持つ商品名。確認の見出しが折り返して収まる。 */
export const LongName: Story = {
  args: { product: LONG_NAME_DISCONTINUE_PRODUCT },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await openConfirmation(canvasElement);
  },
};

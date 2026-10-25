import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import { fireEvent, userEvent, within } from "storybook/test";
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
import { failedActionState, idleActionState } from "@/model/action-state";
import { neverSettlingAction } from "~catalog/lib/pending-action";

import {
  ADMIN_CAMPAIGN_LIST_PATH,
  ADMIN_CAMPAIGN_NEW_PATH,
  ADMIN_PRODUCT_LIST_PATH,
} from "../../paths";
import { CAMPAIGN_CATEGORY_OPTIONS, FILLED_OWN_VALUES } from "./campaign-new.fixture";
import { CAMPAIGN_CODE_CONFLICT_MESSAGE, type CreateCampaignState } from "./form-state";
import { AdminCampaignCreateView } from "./view";

const NAV_GROUPS: readonly AdminShellNavGroup[] = [
  { label: "商品", items: [{ href: ADMIN_PRODUCT_LIST_PATH, label: "商品一覧管理" }] },
  { label: "販促", items: [{ href: ADMIN_CAMPAIGN_LIST_PATH, label: "キャンペーン一覧" }] },
];

/** canvas で冪等キーとして載せる値。送信は起きないので固定でよい。 */
const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-a000-000000000002";

/** canvas では送らない。押した先で何も起きないことを、待ち続けない形で示す。 */
const idle = () => Promise.resolve<CreateCampaignState>(idleActionState());

/** 終わらない送信先。送信中の姿を留める。 */
const pending = () => neverSettlingAction().then(idle);

/**
 * 送信の結果を固定で返す送信先を作る。
 *
 * @param state - 返す結果
 * @returns 送信先
 */
function returning(state: CreateCampaignState) {
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
                <Link href={ADMIN_CAMPAIGN_LIST_PATH}>キャンペーン一覧</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>新規作成</BreadcrumbPage>
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
            <PageHeaderTitle>キャンペーンの新規作成</PageHeaderTitle>
            <PageHeaderDescription>
              コードと、受け取った人へ配るクーポンの内容を決めます。定義すると一覧へ戻ります。
            </PageHeaderDescription>
          </div>
        </PageHeader>
        <Story />
      </ContentContainer>
    </AdminShell>
  );
}

/**
 * 日時の欄へ値を入れる。
 *
 * @remarks
 * `datetime-local` は 1 文字ずつ打てないブラウザがあるため、確定した値を一度に渡します。
 *
 * @param canvasElement - story の canvas
 * @param label - 欄の名前
 * @param value - `datetime-local` の値
 */
function setDateTime(canvasElement: HTMLElement, label: string, value: string) {
  fireEvent.change(within(canvasElement).getByLabelText(label), { target: { value } });
}

/**
 * すべての欄を打ち終える。
 *
 * @param canvasElement - story の canvas
 * @param endsAt - 配布終了。関係の誤りを見せる story だけが変える
 */
async function fillAll(canvasElement: HTMLElement, endsAt = FILLED_OWN_VALUES.endsAt) {
  const canvas = within(canvasElement);

  await userEvent.type(canvas.getByLabelText(/キャンペーンコード/), FILLED_OWN_VALUES.code);
  await userEvent.click(canvas.getByLabelText("定率"));
  await userEvent.type(canvas.getByLabelText(/値引き率/), "15");
  await userEvent.type(canvas.getByLabelText(/上限額/), "20");
  await userEvent.click(canvas.getByLabelText("特定のカテゴリ"));
  await userEvent.selectOptions(canvas.getByRole("combobox", { name: "カテゴリ" }), "家電");
  setDateTime(canvasElement, "配布開始", FILLED_OWN_VALUES.startsAt);
  setDateTime(canvasElement, "配布終了", endsAt);
  setDateTime(canvasElement, "クーポンの有効期限", FILLED_OWN_VALUES.couponExpiresAt);
  await userEvent.type(canvas.getByLabelText(/総枚数の上限/), FILLED_OWN_VALUES.totalLimit);
  await userEvent.type(canvas.getByLabelText(/1 人あたりの上限/), FILLED_OWN_VALUES.perUserLimit);
  await userEvent.type(canvas.getByLabelText(/最低購入額/), FILLED_OWN_VALUES.minPurchaseAmount);
}

/**
 * 打ち終えて確認を開く。
 *
 * @param canvasElement - story の canvas
 */
async function openConfirmation(canvasElement: HTMLElement) {
  await fillAll(canvasElement);
  await userEvent.click(within(canvasElement).getByRole("button", { name: "内容を確認する" }));
  await within(document.body).findByRole("alertdialog");
}

/** 確認の中の送信を押す。 */
async function submitCampaign() {
  const dialog = await within(document.body).findByRole("alertdialog");

  await userEvent.click(within(dialog).getByRole("button", { name: "定義する" }));
}

const meta = {
  title: "Page/Admin/Campaigns/New",
  component: AdminCampaignCreateView,
  parameters: {
    docs: {
      story: { inline: false, iframeHeight: 1100 },
      description: {
        component: [
          "キャンペーンを定義する画面です。**canvas では送信も一覧への移動も起きません**。",
          "期間と上限の大小関係、コードの形、値引きの範囲は送る前に画面が出します（判定の正は接続先）。",
          "定義した後は直せないため、確認を挟みます。",
        ].join(""),
      },
    },
    layout: "fullscreen",
    nextjs: { navigation: { pathname: ADMIN_CAMPAIGN_NEW_PATH } },
  },
  decorators: [withPageFrame],
  args: {
    categoryOptions: CAMPAIGN_CATEGORY_OPTIONS,
    createAction: idle,
    idempotencyKey: IDEMPOTENCY_KEY,
  },
} satisfies Meta<typeof AdminCampaignCreateView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 開いた直後。既定値を置かず、種別を選ぶまで額と対象の欄は出ない。 */
export const Default: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット。 */
export const DefaultTablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ。欄は縦に積まれる。 */
export const DefaultMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 打ち終えた姿。定率なので上限額の欄が並び、カテゴリの選択欄が出る。 */
export const Filled: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => fillAll(canvasElement),
};

/** 何も打たずに確認へ進もうとした。すべての欄の誤りが出て、確認は開かない。 */
export const InvalidFields: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "内容を確認する" }));
  },
};

/** 配布終了が配布開始より前。終了の欄に関係の誤りが出る。 */
export const PeriodReversed: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await fillAll(canvasElement, "2026-09-30T00:00");
    await userEvent.click(within(canvasElement).getByRole("button", { name: "内容を確認する" }));
  },
};

/** 確認。保存される綴りのコードと、配る中身を復唱する。 */
export const Confirming: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => openConfirmation(canvasElement),
};

/** 確認（スマホ）。 */
export const ConfirmingMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  play: async ({ canvasElement }) => openConfirmation(canvasElement),
};

/** 送信中。操作は押せなくなり、確認は閉じない。 */
export const Submitting: Story = {
  args: { createAction: pending },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await openConfirmation(canvasElement);
    await submitCampaign();
  },
};

/** コードが既に使われていた。確認が閉じ、コードの欄に誤りが出る。 */
export const CodeConflicted: Story = {
  args: {
    createAction: returning(
      failedActionState({
        formError: null,
        fieldErrors: { code: [CAMPAIGN_CODE_CONFLICT_MESSAGE] },
        kind: ErrorKind.CONFLICT,
      }),
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await openConfirmation(canvasElement);
    await submitCampaign();
  },
};

/** 接続先が欄を名指しして拒んだ。確認が閉じ、名指しされた欄に誤りが出る。 */
export const RejectedFields: Story = {
  args: {
    createAction: returning(
      failedActionState({
        formError: null,
        fieldErrors: {
          couponExpiresAt: ["クーポンの有効期限は受け付けられませんでした。入力し直してください。"],
        },
        kind: ErrorKind.VALIDATION,
      }),
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await openConfirmation(canvasElement);
    await submitCampaign();
  },
};

/** 接続先が欄を名指しせずに拒んだ。確認の中に全体の文言が出る。 */
export const Rejected: Story = {
  args: {
    createAction: returning(
      failedActionState({
        formError:
          "入力内容を受け付けられませんでした。期間・上限・値引きの組み合わせを確認してください。",
        kind: ErrorKind.VALIDATION,
      }),
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await openConfirmation(canvasElement);
    await submitCampaign();
  },
};

/** 業務の拒否ではない失敗。確認の中にカタログの文言が出る。 */
export const Unavailable: Story = {
  args: {
    createAction: returning(
      failedActionState({
        formError: "ただいま処理できません。時間をおいてもう一度お試しください。",
        kind: ErrorKind.UNAVAILABLE,
      }),
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await openConfirmation(canvasElement);
    await submitCampaign();
  },
};

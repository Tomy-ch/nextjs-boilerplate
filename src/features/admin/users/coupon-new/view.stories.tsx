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
import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";
import { neverSettlingAction } from "~catalog/lib/pending-action";

import {
  ADMIN_DASHBOARD_PATH,
  ADMIN_PRODUCT_LIST_PATH,
  ADMIN_USER_LIST_PATH,
  adminUserCouponNewPath,
} from "../../paths";
import {
  FILLED_ISSUE_OWN_VALUES,
  ISSUE_CATEGORY_OPTIONS,
  ISSUE_RECIPIENT,
  WITHDRAWN_RECIPIENT,
} from "./coupon-new.fixture";
import {
  ISSUE_RECIPIENT_LOST_MESSAGE,
  ISSUE_RESEND_CONFLICT_MESSAGE,
  ISSUE_SCOPE_CATEGORY_LOST_MESSAGE,
  type IssueCouponState,
} from "./form-state";
import { AdminUserCouponNewView } from "./view";

const NAV_GROUPS: readonly AdminShellNavGroup[] = [
  { label: "集計", items: [{ href: ADMIN_DASHBOARD_PATH, label: "ダッシュボード" }] },
  { label: "商品", items: [{ href: ADMIN_PRODUCT_LIST_PATH, label: "商品一覧管理" }] },
  { label: "利用者", items: [{ href: ADMIN_USER_LIST_PATH, label: "利用者一覧" }] },
];

const idle = () => Promise.resolve<IssueCouponState>(idleActionState());

const pending = () => neverSettlingAction().then(idle);

function returning(state: IssueCouponState) {
  return () => Promise.resolve(state);
}

function withPageFrame(Story: () => React.ReactElement) {
  return (
    <AdminShell
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={ADMIN_USER_LIST_PATH}>利用者一覧</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{ISSUE_RECIPIENT.name}</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>クーポンの発行</BreadcrumbPage>
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
      homeHref={ADMIN_DASHBOARD_PATH}
      navGroups={NAV_GROUPS}
      siteHref="/"
      siteName="nextjs-boilerplate"
    >
      <ContentContainer className="py-8">
        <PageHeader>
          <div>
            <PageHeaderTitle>クーポンの発行</PageHeaderTitle>
            <PageHeaderDescription>
              利用者 1 人に、クーポンを 1 枚発行します。発行は取り消せません。
            </PageHeaderDescription>
          </div>
        </PageHeader>
        <Story />
      </ContentContainer>
    </AdminShell>
  );
}

function setDateTime(canvasElement: HTMLElement, label: string, value: string) {
  fireEvent.change(within(canvasElement).getByLabelText(label), { target: { value } });
}

async function fillAll(
  canvasElement: HTMLElement,
  usableFrom = FILLED_ISSUE_OWN_VALUES.usableFrom,
) {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByLabelText("定額"));
  await userEvent.type(canvas.getByLabelText(/値引き額/), "5");
  await userEvent.click(canvas.getByLabelText("特定のカテゴリ"));
  await userEvent.selectOptions(canvas.getByRole("combobox", { name: "カテゴリ" }), "家電");
  setDateTime(canvasElement, "有効期限", FILLED_ISSUE_OWN_VALUES.expiresAt);

  if (usableFrom !== "") {
    setDateTime(canvasElement, "利用開始", usableFrom);
  }

  await userEvent.type(
    canvas.getByLabelText(/最低購入額/),
    FILLED_ISSUE_OWN_VALUES.minPurchaseAmount,
  );
}

async function openConfirmation(canvasElement: HTMLElement) {
  await fillAll(canvasElement);
  await userEvent.click(within(canvasElement).getByRole("button", { name: "内容を確認する" }));
  await within(document.body).findByRole("alertdialog");
}

async function submitIssue() {
  const dialog = await within(document.body).findByRole("alertdialog");

  await userEvent.click(within(dialog).getByRole("button", { name: "発行する" }));
}

async function openAndSubmit({ canvasElement }: { canvasElement: HTMLElement }) {
  await openConfirmation(canvasElement);
  await submitIssue();
}

const meta = {
  title: "Page/Admin/Users/CouponNew",
  component: AdminUserCouponNewView,
  parameters: {
    docs: {
      story: { inline: false, iframeHeight: 1100 },
      description: {
        component: [
          "利用者 1 人にクーポンを 1 枚発行する画面です。**canvas では送信は起きません**。",
          "発行先は URL で決まり、画面では選ばせません。発行は取り消せないため、確認を挟みます。",
          "発行が成立しても画面に留まり、発行した内容を報せます。",
        ].join(""),
      },
    },
    layout: "fullscreen",
    nextjs: { navigation: { pathname: adminUserCouponNewPath(ISSUE_RECIPIENT.id) } },
  },
  decorators: [withPageFrame],
  args: {
    recipient: ISSUE_RECIPIENT,
    categoryOptions: ISSUE_CATEGORY_OPTIONS,
    issueAction: idle,
  },
} satisfies Meta<typeof AdminUserCouponNewView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 開いた直後。発行先が出て、既定値は置かない。 */
export const Default: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット。 */
export const DefaultTablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ。 */
export const DefaultMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 打ち終えた姿。 */
export const Filled: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => fillAll(canvasElement),
};

/** 何も打たずに確認へ進もうとした。 */
export const InvalidFields: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "内容を確認する" }));
  },
};

/** 利用開始が有効期限より後。 */
export const UsableAfterExpiry: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await fillAll(canvasElement, "2027-01-15T00:00");
    await userEvent.click(within(canvasElement).getByRole("button", { name: "内容を確認する" }));
  },
};

/** 確認。発行先の名前と、発行する中身を復唱する。 */
export const Confirming: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => openConfirmation(canvasElement),
};

/** 確認（スマホ）。 */
export const ConfirmingMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  play: async ({ canvasElement }) => openConfirmation(canvasElement),
};

/** 送信中。 */
export const Submitting: Story = {
  args: { issueAction: pending },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: openAndSubmit,
};

/** 発行した。欄の代わりに、発行した内容と次の行き先が出る。 */
export const Issued: Story = {
  args: { issueAction: returning(succeededActionState(undefined)) },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: openAndSubmit,
};

/** 開いた時点で発行先が退会していた。欄を出さない。 */
export const RecipientWithdrawn: Story = {
  args: { recipient: WITHDRAWN_RECIPIENT },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 送ったときに発行先が退会していたか、見つからなかった。 */
export const RecipientLost: Story = {
  args: {
    issueAction: returning(
      failedActionState({
        formError: null,
        fieldErrors: { userId: [ISSUE_RECIPIENT_LOST_MESSAGE] },
        kind: ErrorKind.NOT_FOUND,
      }),
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: openAndSubmit,
};

/** 送ったときに値引きの対象のカテゴリが見つからなかった。確認が閉じ、カテゴリの欄に出る。 */
export const ScopeTargetLost: Story = {
  args: {
    issueAction: returning(
      failedActionState({
        formError: null,
        fieldErrors: { scopeCategoryId: [ISSUE_SCOPE_CATEGORY_LOST_MESSAGE] },
        kind: ErrorKind.NOT_FOUND,
      }),
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: openAndSubmit,
};

/** 接続先が欄を名指しして拒んだ。 */
export const RejectedFields: Story = {
  args: {
    issueAction: returning(
      failedActionState({
        formError: null,
        fieldErrors: {
          expiresAt: ["有効期限は受け付けられませんでした。入力し直してください。"],
        },
        kind: ErrorKind.VALIDATION,
      }),
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: openAndSubmit,
};

/** 接続先が欄を名指しせずに拒んだ。確認の中に全体の文言が出る。 */
export const Rejected: Story = {
  args: {
    issueAction: returning(
      failedActionState({
        formError:
          "入力内容を受け付けられませんでした。値引き・対象・期限の組み合わせを確認してください。",
        kind: ErrorKind.VALIDATION,
      }),
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: openAndSubmit,
};

/** 結果が定まらない失敗。欄を止め、同じ内容の再送だけを受け付ける。 */
export const Unavailable: Story = {
  args: {
    issueAction: returning(
      failedActionState({
        formError: "ただいま処理できません。時間をおいてもう一度お試しください。",
        kind: ErrorKind.UNAVAILABLE,
      }),
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: openAndSubmit,
};

/** 同じ鍵の前回の発行がまだ処理中だった。欄を止めたまま、確認の中に出す。 */
export const ResendConflicted: Story = {
  args: {
    issueAction: returning(
      failedActionState({ formError: ISSUE_RESEND_CONFLICT_MESSAGE, kind: ErrorKind.CONFLICT }),
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: openAndSubmit,
};

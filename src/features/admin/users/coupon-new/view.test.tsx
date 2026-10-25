// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

import { COUPON_DISCOUNT_KIND_MISSING_MESSAGE } from "../../coupon-discount";
import { COUPON_SCOPE_KIND_MISSING_MESSAGE } from "../../coupon-scope";
import { ADMIN_USER_LIST_PATH } from "../../paths";
import { UnsavedChangesGuard } from "../../ui/unsaved-changes-guard/unsaved-changes-guard";
import {
  FILLED_ISSUE_OWN_VALUES,
  ISSUE_CATEGORY_OPTIONS,
  ISSUE_RECIPIENT,
  WITHDRAWN_RECIPIENT,
} from "./coupon-new.fixture";
import { ISSUE_CONFIRMED_VALUE } from "./form-names";
import {
  ISSUE_RECIPIENT_LOST_MESSAGE,
  ISSUE_RESEND_CONFLICT_MESSAGE,
  ISSUE_SCOPE_CATEGORY_LOST_MESSAGE,
  ISSUE_TARGET_UNKNOWN_MESSAGE,
  type IssueCouponAction,
  type IssueCouponState,
} from "./form-state";
import { ISSUE_EXPIRES_AT_MISSING_MESSAGE, type IssueOwnValues } from "./issue-rules";
import type { IssueRecipient } from "./recipient";
import { AdminUserCouponNewView } from "./view";

const guard = vi.hoisted(() => ({ when: false }));

vi.mock("@/components/app-starter/navigation-guard/navigation-guard", () => ({
  NavigationGuard: ({ children, when }: { children: ReactNode; when: boolean }) => {
    guard.when = when;

    return children;
  },
}));

vi.mock("../../use-product-candidates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../use-product-candidates")>()),
  useProductCandidates: () => ({ status: "idle" }),
}));

const LOCKED_MESSAGE =
  "前回の発行の結果が分かるまで、内容は変えられません。同じ内容でもう一度発行してください。";
const FORM_ERROR = "ただいま処理できません。時間をおいてもう一度お試しください。";
const EXPIRY_REJECTED = "有効期限は受け付けられませんでした。入力し直してください。";
const DIALOG_NAME = `${ISSUE_RECIPIENT.name} さんにこのクーポンを発行しますか？`;
const ISSUED_TITLE = `${ISSUE_RECIPIENT.name} さんにクーポンを 1 枚発行しました`;
const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

const ISSUED: IssueCouponState = succeededActionState(undefined);
const UNAVAILABLE = failedActionState<never>({
  formError: FORM_ERROR,
  kind: ErrorKind.UNAVAILABLE,
});
const RESEND_CONFLICTED = failedActionState<never>({
  formError: ISSUE_RESEND_CONFLICT_MESSAGE,
  kind: ErrorKind.CONFLICT,
});
const RECIPIENT_LOST = failedActionState<never, "userId">({
  formError: null,
  fieldErrors: { userId: [ISSUE_RECIPIENT_LOST_MESSAGE] },
  kind: ErrorKind.NOT_FOUND,
});
const CATEGORY_LOST = failedActionState<never, "scopeCategoryId">({
  formError: null,
  fieldErrors: { scopeCategoryId: [ISSUE_SCOPE_CATEGORY_LOST_MESSAGE] },
  kind: ErrorKind.NOT_FOUND,
});
const TARGET_UNKNOWN = failedActionState<never>({
  formError: ISSUE_TARGET_UNKNOWN_MESSAGE,
  kind: ErrorKind.NOT_FOUND,
});
const EXPIRY_INVALID = failedActionState<never, "expiresAt">({
  formError: null,
  fieldErrors: { expiresAt: [EXPIRY_REJECTED] },
  kind: ErrorKind.VALIDATION,
});

let settlePending: (() => void) | undefined;

beforeEach(() => {
  guard.when = false;
});

afterEach(async () => {
  await act(async () => settlePending?.());
  settlePending = undefined;
});

function sending(...results: IssueCouponState[]) {
  const action = vi.fn<IssueCouponAction>(() => Promise.resolve(idleActionState()));

  for (const result of results) {
    action.mockResolvedValueOnce(result);
  }

  return action;
}

function viewOf(issueAction: IssueCouponAction, recipient: IssueRecipient) {
  return (
    <UnsavedChangesGuard>
      <AdminUserCouponNewView
        categoryOptions={ISSUE_CATEGORY_OPTIONS}
        issueAction={issueAction}
        recipient={recipient}
      />
    </UnsavedChangesGuard>
  );
}

function renderView(
  issueAction: IssueCouponAction = sending(),
  recipient: IssueRecipient = ISSUE_RECIPIENT,
) {
  return render(viewOf(issueAction, recipient));
}

function dateField(label: string): HTMLElement {
  return screen.getByLabelText(label);
}

function categoryField(): HTMLElement {
  return screen.getByRole("combobox", { name: "カテゴリ" });
}

function setDateTime(label: string, value: string) {
  fireEvent.change(dateField(label), { target: { value } });
}

async function fillAll(overrides: Partial<IssueOwnValues> = {}, category = "家電") {
  const own = { ...FILLED_ISSUE_OWN_VALUES, ...overrides };

  await userEvent.click(screen.getByRole("radio", { name: "定額" }));
  await userEvent.type(screen.getByRole("textbox", { name: "値引き額（ドル）" }), "5");
  await userEvent.click(screen.getByRole("radio", { name: "特定のカテゴリ" }));
  await userEvent.selectOptions(categoryField(), category);
  setDateTime("有効期限", own.expiresAt);

  if (own.usableFrom !== "") {
    setDateTime("利用開始", own.usableFrom);
  }

  if (own.minPurchaseAmount !== "") {
    await userEvent.type(
      screen.getByRole("textbox", { name: "最低購入額（ドル）" }),
      own.minPurchaseAmount,
    );
  }
}

async function openConfirmation(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole("button", { name: "内容を確認する" }));

  return screen.findByRole("alertdialog");
}

async function send(dialog: HTMLElement) {
  await userEvent.click(within(dialog).getByRole("button", { name: "発行する" }));
}

async function fillAndSend(overrides: Partial<IssueOwnValues> = {}): Promise<HTMLElement> {
  await fillAll(overrides);

  const dialog = await openConfirmation();

  await send(dialog);

  return dialog;
}

function sent(action: ReturnType<typeof sending>, index: number): FormData {
  const formData = action.mock.calls[index]?.[1];

  if (formData === undefined) {
    throw new Error(`${index + 1} 回目の送信がありません`);
  }

  return formData;
}

function keyOf(action: ReturnType<typeof sending>, index: number): FormDataEntryValue | null {
  return sent(action, index).get(IDEMPOTENCY_KEY_FIELD);
}

function summaryOf(scope: HTMLElement): [string | null, string | null][] {
  const details = within(scope).getAllByRole("definition");

  return within(scope)
    .getAllByRole("term")
    .map((term, index) => [term.textContent, details[index]?.textContent ?? null]);
}

function recipientCard(): HTMLElement {
  const card = screen.getByRole("heading", { name: "発行先" }).closest("section");

  if (card === null) {
    throw new Error("発行先の面がありません");
  }

  return card;
}

describe("AdminUserCouponNewView", () => {
  // ----- 開いた直後 -----
  it("発行先の氏名とメールアドレスを、この画面では変えられないことと並べて出す", () => {
    renderView();

    const card = recipientCard();

    expect(summaryOf(card)).toEqual([
      ["氏名", ISSUE_RECIPIENT.name],
      ["メールアドレス", ISSUE_RECIPIENT.email],
    ]);
    expect(card).toHaveTextContent("この画面では発行先を変えられません");
  });

  it("発行先を選ぶ・打つ欄をどこにも置かない", () => {
    renderView();

    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(
      screen.queryByRole("textbox", { name: /発行先|氏名|メール|利用者/ }),
    ).not.toBeInTheDocument();
    expect(within(recipientCard()).queryAllByRole("textbox")).toHaveLength(0);
    expect(within(recipientCard()).queryAllByRole("button")).toHaveLength(0);
  });

  it("確認を閉じたまま開き、結果の定まらない送信が無いうちは欄を止めない", () => {
    renderView();

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByText(LOCKED_MESSAGE)).not.toBeInTheDocument();
    expect(dateField("有効期限")).toBeEnabled();
  });

  it("やめる導線を利用者一覧へ向ける", () => {
    renderView();

    expect(screen.getByRole("link", { name: "キャンセル" })).toHaveAttribute(
      "href",
      ADMIN_USER_LIST_PATH,
    );
  });

  it("開いた直後は離れる操作を見張らせない", () => {
    renderView();

    expect(guard.when).toBe(false);
  });

  it("開いた直後の a11y 検査を通る", async () => {
    const { container } = renderView();

    expect((await axe(container, AXE_OPTIONS)).violations).toEqual([]);
  });

  // ----- 退会済みのとき -----
  it("発行先が退会済みなら、発行先を出したまま発行できない理由と戻り先だけを出す", () => {
    renderView(sending(), WITHDRAWN_RECIPIENT);

    expect(recipientCard()).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "退会済みの利用者です" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "内容を確認する" })).not.toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "利用者一覧へ戻る" })).toHaveAttribute(
      "href",
      ADMIN_USER_LIST_PATH,
    );
  });

  it("退会済みの姿で a11y 検査を通る", async () => {
    const { container } = renderView(sending(), WITHDRAWN_RECIPIENT);

    expect((await axe(container, AXE_OPTIONS)).violations).toEqual([]);
  });

  // ----- 入力中 -----
  it("何も打たずに確認へ進もうとすると、確認を開かず、必須の欄に誤りを出す", async () => {
    renderView();

    await userEvent.click(screen.getByRole("button", { name: "内容を確認する" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "値引きの種類" })).toHaveAccessibleDescription(
      COUPON_DISCOUNT_KIND_MISSING_MESSAGE,
    );
    expect(screen.getByRole("group", { name: "対象の範囲" })).toHaveAccessibleDescription(
      COUPON_SCOPE_KIND_MISSING_MESSAGE,
    );
    expect(dateField("有効期限")).toHaveAccessibleDescription(
      expect.stringContaining(ISSUE_EXPIRES_AT_MISSING_MESSAGE),
    );
    expect(dateField("利用開始")).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByRole("textbox", { name: "最低購入額（ドル）" })).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("誤りを出した状態で a11y 検査を通る", async () => {
    const { container } = renderView();

    await userEvent.click(screen.getByRole("button", { name: "内容を確認する" }));

    expect((await axe(container, AXE_OPTIONS)).violations).toEqual([]);
  });

  it("打ち始めると書きかけとして離れる操作を見張らせる", async () => {
    renderView();

    await userEvent.click(screen.getByRole("radio", { name: "定額" }));

    await waitFor(() => expect(guard.when).toBe(true));
  });

  // ----- 確認中 -----
  it("確認では発行先の名前で問い、値引き・対象・期限・条件を順に復唱する", async () => {
    renderView();

    await fillAll();
    const dialog = await openConfirmation();

    expect(dialog).toHaveAccessibleName(DIALOG_NAME);
    expect(summaryOf(dialog)).toEqual([
      ["値引き", "5 ドル引き"],
      ["値引きの対象", "特定のカテゴリ：家電"],
      ["有効期限", "2026/12/31 23:59"],
      ["利用開始", "発行した時点から"],
      ["最低購入額", "50 ドル以上"],
    ]);
  });

  it("選んだカテゴリの名前で対象を復唱する", async () => {
    renderView();

    await fillAll({}, "雑貨");
    const dialog = await openConfirmation();

    expect(summaryOf(dialog)).toContainEqual(["値引きの対象", "特定のカテゴリ：雑貨"]);
  });

  it("確認を通った送信に、URL が決めた発行先・打った値・冪等キー・確認の合図を載せる", async () => {
    const action = sending();

    renderView(action);
    await fillAndSend();
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    const formData = sent(action, 0);

    expect(formData.get("userId")).toBe(ISSUE_RECIPIENT.id);
    expect(formData.get("expiresAt")).toBe(
      new Date(FILLED_ISSUE_OWN_VALUES.expiresAt).toISOString(),
    );
    expect(formData.get("usableFrom")).toBe("");
    expect(formData.get("minPurchaseAmount")).toBe("50");
    expect(formData.get("discountKind")).toBe("flat");
    expect(formData.get("discountValue")).toBe("5");
    expect(formData.get("discountMaxAmount")).toBeNull();
    expect(formData.get("scopeKind")).toBe("category");
    expect(formData.get("scopeCategoryId")).toBe(ISSUE_CATEGORY_OPTIONS[0]?.value);
    expect(formData.get("scopeProductId")).toBeNull();
    expect(formData.get(IDEMPOTENCY_KEY_FIELD)).toMatch(/\S/);
    expect(formData.get("confirmed")).toBe(ISSUE_CONFIRMED_VALUE);
  });

  it("確認をやめると閉じ、打った値を残して送らない", async () => {
    const action = sending();

    renderView(action);
    await fillAll();
    const dialog = await openConfirmation();

    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(dateField("有効期限")).toHaveValue(FILLED_ISSUE_OWN_VALUES.expiresAt);
    expect(categoryField()).toHaveValue(ISSUE_CATEGORY_OPTIONS[0]?.value);
    expect(action).not.toHaveBeenCalled();
  });

  it("確認を開いた状態で a11y 検査を通る", async () => {
    const { baseElement } = renderView();

    await fillAll();
    await openConfirmation();

    expect((await axe(baseElement, AXE_OPTIONS)).violations).toEqual([]);
  });

  // ----- 送信中 -----
  it("送っているあいだは確認を開いたまま、送信の操作を押せなくする", async () => {
    const action = vi.fn<IssueCouponAction>(
      () =>
        new Promise((resolve) => {
          settlePending = () => resolve(idleActionState());
        }),
    );

    renderView(action);
    const dialog = await fillAndSend();

    expect(await within(dialog).findByRole("button", { name: "発行しています…" })).toBeDisabled();
    expect(screen.getByRole("alertdialog")).toBe(dialog);
  });

  // ----- 発行したとき -----
  it("発行できたら確認を閉じ、欄の代わりに発行先の名前と送った内容を報せる", async () => {
    renderView(sending(ISSUED));

    await fillAndSend();

    const result = await screen.findByRole("alert");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(result).toHaveTextContent(ISSUED_TITLE);
    expect(summaryOf(result)).toEqual([
      ["値引き", "5 ドル引き"],
      ["値引きの対象", "特定のカテゴリ：家電"],
      ["有効期限", "2026/12/31 23:59"],
      ["利用開始", "発行した時点から"],
      ["最低購入額", "50 ドル以上"],
    ]);
    expect(screen.queryByRole("button", { name: "内容を確認する" })).not.toBeInTheDocument();
  });

  it("発行のあとは、書きかけとして離れる操作を見張らせない", async () => {
    renderView(sending(ISSUED));

    await fillAndSend();
    await screen.findByText(ISSUED_TITLE);

    await waitFor(() => expect(guard.when).toBe(false));
  });

  it("続けて発行すると、空の欄へ戻す", async () => {
    renderView(sending(ISSUED));

    await fillAndSend();
    await userEvent.click(await screen.findByRole("button", { name: "続けて発行する" }));

    expect(screen.getByRole("radio", { name: "定額" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "特定のカテゴリ" })).not.toBeChecked();
    expect(dateField("有効期限")).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "最低購入額（ドル）" })).toHaveValue("");
  });

  it("発行のあとに続けて発行すると、前の発行と別の冪等キーで送る", async () => {
    const action = sending(ISSUED);

    renderView(action);
    await fillAndSend();
    await userEvent.click(await screen.findByRole("button", { name: "続けて発行する" }));
    await fillAndSend();
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));

    expect(keyOf(action, 1)).not.toBe(keyOf(action, 0));
  });

  it("発行を報せた状態で a11y 検査を通る", async () => {
    const { container } = renderView(sending(ISSUED));

    await fillAndSend();
    await screen.findByText(ISSUED_TITLE);

    expect((await axe(container, AXE_OPTIONS)).violations).toEqual([]);
  });

  // ----- 発行先を失ったとき -----
  it("発行先が退会したか見つからなければ、欄を下げて発行できなかったことを報せる", async () => {
    renderView(sending(RECIPIENT_LOST));

    await fillAndSend();

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(ISSUE_RECIPIENT_LOST_MESSAGE);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "内容を確認する" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "利用者一覧へ戻る" })).toHaveAttribute(
      "href",
      ADMIN_USER_LIST_PATH,
    );
  });

  it("発行先を失ったあとは、書きかけが残っていても離れる操作を見張らせない", async () => {
    renderView(sending(RECIPIENT_LOST));

    await fillAll();
    await waitFor(() => expect(guard.when).toBe(true));
    await send(await openConfirmation());
    await screen.findByText(ISSUE_RECIPIENT_LOST_MESSAGE);

    await waitFor(() => expect(guard.when).toBe(false));
  });

  it("発行先を失った状態で a11y 検査を通る", async () => {
    const { container } = renderView(sending(RECIPIENT_LOST));

    await fillAndSend();
    await screen.findByText(ISSUE_RECIPIENT_LOST_MESSAGE);

    expect((await axe(container, AXE_OPTIONS)).violations).toEqual([]);
  });

  // ----- 値引きの対象を失ったとき -----
  it("対象のカテゴリが見つからなければ、欄を残して確認を閉じ、カテゴリの欄にだけ文言を出す", async () => {
    renderView(sending(CATEGORY_LOST));

    await fillAndSend();

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(categoryField()).toHaveAccessibleDescription(
      expect.stringContaining(ISSUE_SCOPE_CATEGORY_LOST_MESSAGE),
    );
    expect(categoryField()).toBeEnabled();
    expect(screen.queryByText(ISSUE_RECIPIENT_LOST_MESSAGE)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "内容を確認する" })).toBeInTheDocument();
  });

  it("対象のカテゴリを失ったあとは欄を止めず、選び直した送信を別の冪等キーで送る", async () => {
    const action = sending(CATEGORY_LOST);

    renderView(action);
    await fillAndSend();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    expect(screen.queryByText(LOCKED_MESSAGE)).not.toBeInTheDocument();

    await userEvent.selectOptions(categoryField(), "雑貨");
    await send(await openConfirmation());
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));

    expect(sent(action, 1).get("scopeCategoryId")).toBe(ISSUE_CATEGORY_OPTIONS[1]?.value);
    expect(keyOf(action, 1)).not.toBe(keyOf(action, 0));
  });

  it("発行先か対象かを言い当てられない拒否では、確認を開いたまま全体の文言を出し、次は別の冪等キーで送る", async () => {
    const action = sending(TARGET_UNKNOWN);

    renderView(action);
    const dialog = await fillAndSend();
    const alert = await within(dialog).findByRole("alert");

    expect(alert).toHaveTextContent(ISSUE_TARGET_UNKNOWN_MESSAGE);
    expect(screen.getByRole("alertdialog")).toBe(dialog);
    expect(screen.queryByText(LOCKED_MESSAGE)).not.toBeInTheDocument();

    await send(dialog);
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));

    expect(keyOf(action, 1)).not.toBe(keyOf(action, 0));
  });

  // ----- 欄の誤りで差し戻されたとき -----
  it("接続先が名指しした欄に返った文言を出し、確認を閉じ、欄を止めない", async () => {
    renderView(sending(EXPIRY_INVALID));

    await fillAndSend();

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(dateField("有効期限")).toHaveAccessibleDescription(
      expect.stringContaining(EXPIRY_REJECTED),
    );
    expect(screen.queryByText(LOCKED_MESSAGE)).not.toBeInTheDocument();
    expect(dateField("有効期限")).toBeEnabled();
  });

  it("欄を名指しした拒否のあとは、打ち直した送信を別の冪等キーで送る", async () => {
    const action = sending(EXPIRY_INVALID);

    renderView(action);
    await fillAndSend();
    await screen.findByText(EXPIRY_REJECTED);
    setDateTime("有効期限", "2027-01-31T23:59");
    await send(await openConfirmation());
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));

    expect(keyOf(action, 1)).not.toBe(keyOf(action, 0));
  });

  it("返った文言は、その欄を打ち直すと下げる", async () => {
    renderView(sending(EXPIRY_INVALID));

    await fillAndSend();
    await screen.findByText(EXPIRY_REJECTED);
    setDateTime("有効期限", "2027-01-31T23:59");

    expect(screen.queryByText(EXPIRY_REJECTED)).not.toBeInTheDocument();
  });

  it("全体の文言と欄の誤りが両方返れば確認を閉じ、全体の文言は出さない", async () => {
    renderView(
      sending(
        failedActionState<never, "expiresAt">({
          formError: FORM_ERROR,
          fieldErrors: { expiresAt: [EXPIRY_REJECTED] },
          kind: ErrorKind.VALIDATION,
        }),
      ),
    );

    await fillAndSend();

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByText(EXPIRY_REJECTED)).toBeInTheDocument();
    expect(screen.queryByText(FORM_ERROR)).not.toBeInTheDocument();
  });

  // ----- 全体の文言だけが返ったとき -----
  it("欄を名指ししない拒否では確認を開いたまま、全体の文言を確認の中にだけ出す", async () => {
    renderView(sending(failedActionState({ formError: FORM_ERROR, kind: ErrorKind.VALIDATION })));

    const dialog = await fillAndSend();
    const alert = await within(dialog).findByRole("alert");

    expect(alert).toHaveTextContent("発行できませんでした");
    expect(alert).toHaveTextContent(FORM_ERROR);
    expect(screen.getByRole("alertdialog")).toBe(dialog);
    expect(screen.getAllByText(FORM_ERROR)).toHaveLength(1);
  });

  it("確認を開き直すと、直前の失敗を下げる", async () => {
    renderView(sending(failedActionState({ formError: FORM_ERROR, kind: ErrorKind.VALIDATION })));

    const dialog = await fillAndSend();

    await within(dialog).findByText(FORM_ERROR);
    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));
    const reopened = await openConfirmation();

    expect(within(reopened).queryByRole("alert")).not.toBeInTheDocument();
  });

  // ----- 結果が定まらない失敗のあと -----
  it("結果が定まらない失敗のあとは止めた理由を出し、欄を止めて、確認へ進む操作だけを残す", async () => {
    renderView(sending(UNAVAILABLE));

    const dialog = await fillAndSend({ usableFrom: "2026-10-15T09:00" });

    await within(dialog).findByText(FORM_ERROR);
    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));

    expect(screen.getByText(LOCKED_MESSAGE)).toBeInTheDocument();
    expect(dateField("有効期限")).toBeDisabled();
    expect(categoryField()).toBeDisabled();
    expect(screen.getByRole("radio", { name: "定額" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "利用開始を空欄に戻す" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "内容を確認する" })).toBeEnabled();
  });

  it("止めたあとも確認を開け、1 回目と同じ冪等キーと同じ値で送り直す", async () => {
    const action = sending(UNAVAILABLE);

    renderView(action);
    const dialog = await fillAndSend();

    await within(dialog).findByText(FORM_ERROR);
    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));
    await send(await openConfirmation());
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));

    expect(keyOf(action, 1)).toBe(keyOf(action, 0));
    expect([...sent(action, 1).entries()]).toEqual([...sent(action, 0).entries()]);
  });

  it("前回の発行が処理中だという 409 なら、確認の中に文言を出し、欄を止めたまま同じ冪等キーで送り直す", async () => {
    const action = sending(RESEND_CONFLICTED);

    renderView(action);
    const dialog = await fillAndSend();

    await within(dialog).findByText(ISSUE_RESEND_CONFLICT_MESSAGE);

    expect(screen.getByRole("alertdialog")).toBe(dialog);
    expect(screen.getByText(LOCKED_MESSAGE)).toBeInTheDocument();
    expect(dateField("有効期限")).toBeDisabled();

    await send(dialog);
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));

    expect(keyOf(action, 1)).toBe(keyOf(action, 0));
  });

  it("結果が定まらない失敗のあとの送り直しが 409 でも、欄を止めたまま同じ冪等キーで送り直す", async () => {
    const action = sending(UNAVAILABLE, RESEND_CONFLICTED);

    renderView(action);
    const dialog = await fillAndSend();

    await within(dialog).findByText(FORM_ERROR);
    await send(dialog);
    await within(dialog).findByText(ISSUE_RESEND_CONFLICT_MESSAGE);

    expect(screen.getByText(LOCKED_MESSAGE)).toBeInTheDocument();
    expect(dateField("有効期限")).toBeDisabled();

    await send(screen.getByRole("alertdialog"));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(3));

    expect(keyOf(action, 1)).toBe(keyOf(action, 0));
    expect(keyOf(action, 2)).toBe(keyOf(action, 0));
  });

  it("結果が定まらない失敗のあとの送り直しに欄を名指しした拒否が返れば、欄の止めを解き、次は別の冪等キーで送る", async () => {
    const action = sending(UNAVAILABLE, EXPIRY_INVALID);

    renderView(action);
    const dialog = await fillAndSend();

    await within(dialog).findByText(FORM_ERROR);
    await send(dialog);

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.queryByText(LOCKED_MESSAGE)).not.toBeInTheDocument();
    expect(dateField("有効期限")).toBeEnabled();

    await send(await openConfirmation());
    await waitFor(() => expect(action).toHaveBeenCalledTimes(3));

    expect(keyOf(action, 1)).toBe(keyOf(action, 0));
    expect(keyOf(action, 2)).not.toBe(keyOf(action, 0));
  });

  it("結果が定まらない失敗のあとの送り直しで対象のカテゴリを失えば、欄の止めを解き、次は別の冪等キーで送る", async () => {
    const action = sending(UNAVAILABLE, CATEGORY_LOST);

    renderView(action);
    const dialog = await fillAndSend();

    await within(dialog).findByText(FORM_ERROR);
    await send(dialog);

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(categoryField()).toBeEnabled();

    await userEvent.selectOptions(categoryField(), "雑貨");
    await send(await openConfirmation());
    await waitFor(() => expect(action).toHaveBeenCalledTimes(3));

    expect(keyOf(action, 2)).not.toBe(keyOf(action, 0));
  });

  it("欄を止めた状態で a11y 検査を通る", async () => {
    const { container } = renderView(sending(UNAVAILABLE));

    const dialog = await fillAndSend();

    await within(dialog).findByText(FORM_ERROR);
    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));

    expect((await axe(container, AXE_OPTIONS)).violations).toEqual([]);
  });

  // ----- 開き直したとき -----
  it("画面を開き直すと、前の画面と別の冪等キーで送る", async () => {
    const action = sending();
    const first = renderView(action);

    await fillAndSend();
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    first.unmount();

    renderView(action);
    await fillAndSend();
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));

    expect(keyOf(action, 1)).not.toBe(keyOf(action, 0));
  });
});

// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState } from "@/model/action-state";

import { COUPON_DISCOUNT_KIND_MISSING_MESSAGE } from "../../coupon-discount";
import { ADMIN_CAMPAIGN_LIST_PATH } from "../../paths";
import { UnsavedChangesGuard } from "../../ui/unsaved-changes-guard/unsaved-changes-guard";
import {
  CAMPAIGN_CATEGORY_OPTIONS,
  FILLED_OWN_VALUES,
  FOUND_PRODUCTS,
} from "./campaign-new.fixture";
import {
  CAMPAIGN_CODE_INVALID_MESSAGE,
  CAMPAIGN_DATE_MISSING_MESSAGE,
  CAMPAIGN_ENDS_BEFORE_START_MESSAGE,
  CAMPAIGN_EXPIRES_BEFORE_END_MESSAGE,
  CAMPAIGN_LIMIT_INVALID_MESSAGE,
  CAMPAIGN_PER_USER_OVER_TOTAL_MESSAGE,
  CAMPAIGN_USABLE_AFTER_EXPIRY_MESSAGE,
  type CampaignOwnValues,
} from "./campaign-rules";
import {
  COUPON_SCOPE_CATEGORY_MISSING_MESSAGE,
  COUPON_SCOPE_KIND_MISSING_MESSAGE,
} from "./coupon-scope";
import { CAMPAIGN_CONFIRMED_VALUE } from "./form-names";
import {
  CAMPAIGN_CODE_CONFLICT_MESSAGE,
  CAMPAIGN_RESEND_CONFLICT_MESSAGE,
  type CreateCampaignAction,
  type CreateCampaignState,
} from "./form-state";
import { AdminCampaignCreateView } from "./view";

const guard = vi.hoisted(() => ({ when: false }));

vi.mock("@/components/app-starter/navigation-guard/navigation-guard", () => ({
  NavigationGuard: ({ children, when }: { children: ReactNode; when: boolean }) => {
    guard.when = when;

    return children;
  },
}));

vi.mock("./use-product-candidates", async (importOriginal) => {
  const fixture = await import("./campaign-new.fixture");

  return {
    ...(await importOriginal<typeof import("./use-product-candidates")>()),
    useProductCandidates: () => fixture.FOUND_PRODUCTS,
  };
});

const LOCKED_MESSAGE =
  "前回の定義の結果が分かるまで、内容は変えられません。同じ内容でもう一度定義してください。";
const FORM_ERROR = "ただいま処理できません。時間をおいてもう一度お試しください。";
const EXPIRY_REJECTED = "クーポンの有効期限は受け付けられませんでした。入力し直してください。";
const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

const CONFLICTED = failedActionState<never, "code">({
  formError: null,
  fieldErrors: { code: [CAMPAIGN_CODE_CONFLICT_MESSAGE] },
  kind: ErrorKind.CONFLICT,
});
const UNAVAILABLE = failedActionState<never>({
  formError: FORM_ERROR,
  kind: ErrorKind.UNAVAILABLE,
});

let settlePending: (() => void) | undefined;

beforeEach(() => {
  guard.when = false;
});

afterEach(() => {
  settlePending?.();
  settlePending = undefined;
});

function sending(...results: CreateCampaignState[]) {
  const action = vi.fn<CreateCampaignAction>(() => Promise.resolve(idleActionState()));

  for (const result of results) {
    action.mockResolvedValueOnce(result);
  }

  return action;
}

function renderView(createAction: CreateCampaignAction = sending()) {
  return render(
    <UnsavedChangesGuard>
      <AdminCampaignCreateView
        categoryOptions={CAMPAIGN_CATEGORY_OPTIONS}
        createAction={createAction}
      />
    </UnsavedChangesGuard>,
  );
}

function codeField(): HTMLElement {
  return screen.getByRole("textbox", { name: "キャンペーンコード", hidden: true });
}

function dateField(label: string): HTMLElement {
  return screen.getByLabelText(label);
}

function countField(name: string): HTMLElement {
  return screen.getByRole("spinbutton", { name });
}

function setDateTime(label: string, value: string) {
  fireEvent.change(dateField(label), { target: { value } });
}

async function fillAll(overrides: Partial<CampaignOwnValues> = {}) {
  const own = { ...FILLED_OWN_VALUES, ...overrides };

  await userEvent.type(codeField(), own.code);
  await userEvent.click(screen.getByRole("radio", { name: "定率" }));
  await userEvent.type(screen.getByRole("textbox", { name: "値引き率（%）" }), "15");
  await userEvent.type(screen.getByRole("textbox", { name: "上限額（ドル）" }), "20");
  await userEvent.click(screen.getByRole("radio", { name: "特定のカテゴリ" }));
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "カテゴリ" }), "家電");
  setDateTime("配布開始", own.startsAt);
  setDateTime("配布終了", own.endsAt);
  setDateTime("クーポンの有効期限", own.couponExpiresAt);

  if (own.usableFrom !== "") {
    setDateTime("クーポンの利用開始", own.usableFrom);
  }

  await userEvent.type(countField("総枚数の上限"), own.totalLimit);
  await userEvent.type(countField("1 人あたりの上限"), own.perUserLimit);

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
  await userEvent.click(within(dialog).getByRole("button", { name: "定義する" }));
}

async function fillAndSend(overrides: Partial<CampaignOwnValues> = {}): Promise<HTMLElement> {
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

function summaryOf(dialog: HTMLElement): [string | null, string | null][] {
  const details = within(dialog).getAllByRole("definition");

  return within(dialog)
    .getAllByRole("term")
    .map((term, index) => [term.textContent, details[index]?.textContent ?? null]);
}

function detailOf(dialog: HTMLElement, term: string): string | null | undefined {
  return summaryOf(dialog).find(([shown]) => shown === term)?.[1];
}

describe("AdminCampaignCreateView", () => {
  // ----- 入力前 -----
  it("既定の選択を置かず、種別を選ぶまで額と対象の欄を出さない", () => {
    renderView();

    for (const name of ["定額", "定率", "全商品", "特定のカテゴリ", "特定の商品"]) {
      expect(screen.getByRole("radio", { name })).not.toBeChecked();
    }
    expect(screen.queryByRole("textbox", { name: "値引き額（ドル）" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "値引き率（%）" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "カテゴリ" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "商品" })).not.toBeInTheDocument();
  });

  it("結果の定まらない送信が無いうちは、欄を止めず、止めた理由も出さない", () => {
    renderView();

    expect(screen.queryByText(LOCKED_MESSAGE)).not.toBeInTheDocument();
    expect(codeField()).toBeEnabled();
  });

  it("やめる導線を一覧へ向ける", () => {
    renderView();

    expect(screen.getByRole("link", { name: "キャンセル" })).toHaveAttribute(
      "href",
      ADMIN_CAMPAIGN_LIST_PATH,
    );
  });

  it("触れていない欄には誤りを出さない", () => {
    renderView();

    expect(codeField()).not.toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_CODE_INVALID_MESSAGE),
    );
    expect(countField("総枚数の上限")).not.toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_LIMIT_INVALID_MESSAGE),
    );
  });

  it("打って離れたコードが読めなければ、コードの欄にだけ誤りを出す", async () => {
    renderView();

    await userEvent.type(codeField(), "abc");
    await userEvent.tab();

    expect(codeField()).toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_CODE_INVALID_MESSAGE),
    );
    expect(countField("総枚数の上限")).not.toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_LIMIT_INVALID_MESSAGE),
    );
    expect(dateField("配布開始")).not.toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_DATE_MISSING_MESSAGE),
    );
  });

  it("開いた直後の a11y 検査を通る", async () => {
    const { container } = renderView();

    expect((await axe(container, AXE_OPTIONS)).violations).toEqual([]);
  });

  // ----- 入力中 -----
  it("何も打たずに確認へ進もうとすると、確認を開かず、必須の欄すべてに誤りを出す", async () => {
    renderView();

    await userEvent.click(screen.getByRole("button", { name: "内容を確認する" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(codeField()).toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_CODE_INVALID_MESSAGE),
    );
    expect(screen.getByRole("group", { name: "値引きの種類" })).toHaveAccessibleDescription(
      COUPON_DISCOUNT_KIND_MISSING_MESSAGE,
    );
    expect(screen.getByRole("group", { name: "対象の範囲" })).toHaveAccessibleDescription(
      COUPON_SCOPE_KIND_MISSING_MESSAGE,
    );
    for (const label of ["配布開始", "配布終了", "クーポンの有効期限"]) {
      expect(dateField(label)).toHaveAccessibleDescription(
        expect.stringContaining(CAMPAIGN_DATE_MISSING_MESSAGE),
      );
    }
    for (const name of ["総枚数の上限", "1 人あたりの上限"]) {
      expect(countField(name)).toHaveAccessibleDescription(
        expect.stringContaining(CAMPAIGN_LIMIT_INVALID_MESSAGE),
      );
    }
    expect(dateField("クーポンの利用開始")).toHaveAttribute("aria-invalid", "false");
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

  it("読めない欄があるうちは確認を開かず、その欄にだけ誤りを出す", async () => {
    renderView();

    await fillAll({ totalLimit: "0" });
    await userEvent.click(screen.getByRole("button", { name: "内容を確認する" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(countField("総枚数の上限")).toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_LIMIT_INVALID_MESSAGE),
    );
    expect(countField("1 人あたりの上限")).toHaveAttribute("aria-invalid", "false");
    expect(codeField()).toHaveAttribute("aria-invalid", "false");
  });

  it("配布終了が配布開始より前なら、送る前に配布終了へ順序の誤りを出し、送らない", async () => {
    const action = sending();

    renderView(action);
    await fillAll({ endsAt: "2026-09-30T00:00" });
    await userEvent.click(screen.getByRole("button", { name: "内容を確認する" }));

    expect(dateField("配布終了")).toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_ENDS_BEFORE_START_MESSAGE),
    );
    expect(dateField("配布開始")).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("配布終了が配布開始と同じ時刻でも、順序の誤りを出して確認を開かない", async () => {
    renderView();

    await fillAll({ endsAt: FILLED_OWN_VALUES.startsAt });
    await userEvent.click(screen.getByRole("button", { name: "内容を確認する" }));

    expect(dateField("配布終了")).toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_ENDS_BEFORE_START_MESSAGE),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("配布終了が配布開始の 1 分後なら、確認を開く", async () => {
    renderView();

    await fillAll({ endsAt: "2026-10-01T00:01" });

    expect(await openConfirmation()).toBeInTheDocument();
  });

  it("配布開始を前へ直すと、配布終了に出ていた順序の誤りを下げる", async () => {
    renderView();

    await fillAll({ endsAt: "2026-09-30T00:00" });
    await userEvent.click(screen.getByRole("button", { name: "内容を確認する" }));
    setDateTime("配布開始", "2026-09-01T00:00");

    expect(dateField("配布終了")).not.toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_ENDS_BEFORE_START_MESSAGE),
    );
  });

  it("有効期限が配布終了より後でなければ、有効期限の欄に誤りを出す", async () => {
    renderView();

    await fillAll({ couponExpiresAt: FILLED_OWN_VALUES.endsAt });
    await userEvent.click(screen.getByRole("button", { name: "内容を確認する" }));

    expect(dateField("クーポンの有効期限")).toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_EXPIRES_BEFORE_END_MESSAGE),
    );
    expect(dateField("配布終了")).toHaveAttribute("aria-invalid", "false");
  });

  it("利用開始が有効期限より前でなければ、利用開始の欄に誤りを出す", async () => {
    renderView();

    await fillAll({ usableFrom: FILLED_OWN_VALUES.couponExpiresAt });
    await userEvent.click(screen.getByRole("button", { name: "内容を確認する" }));

    expect(dateField("クーポンの利用開始")).toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_USABLE_AFTER_EXPIRY_MESSAGE),
    );
    expect(dateField("クーポンの有効期限")).toHaveAttribute("aria-invalid", "false");
  });

  it("1 人あたりの上限が総枚数を超えれば、1 人あたりの上限の欄に誤りを出す", async () => {
    renderView();

    await fillAll({ perUserLimit: "1001" });
    await userEvent.click(screen.getByRole("button", { name: "内容を確認する" }));

    expect(countField("1 人あたりの上限")).toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_PER_USER_OVER_TOTAL_MESSAGE),
    );
    expect(countField("総枚数の上限")).toHaveAttribute("aria-invalid", "false");
  });

  it("値引きの種類を選ぶと、その種類の額の欄を出し、上限額は定率のときだけ出す", async () => {
    renderView();

    await userEvent.click(screen.getByRole("radio", { name: "定額" }));

    expect(screen.getByRole("textbox", { name: "値引き額（ドル）" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "上限額（ドル）" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "定率" }));

    expect(screen.getByRole("textbox", { name: "値引き率（%）" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "上限額（ドル）" })).toBeInTheDocument();
  });

  it("選んだカテゴリを外すと、離れるのを待たずにカテゴリの欄へ誤りを出す", async () => {
    renderView();

    await userEvent.click(screen.getByRole("radio", { name: "特定のカテゴリ" }));
    const category = screen.getByRole("combobox", { name: "カテゴリ" });

    expect(category).not.toHaveAccessibleDescription(
      expect.stringContaining(COUPON_SCOPE_CATEGORY_MISSING_MESSAGE),
    );

    await userEvent.selectOptions(category, "家電");
    await userEvent.selectOptions(category, "選んでください");

    expect(category).toHaveAccessibleDescription(
      expect.stringContaining(COUPON_SCOPE_CATEGORY_MISSING_MESSAGE),
    );
  });

  it("利用開始を打つと空欄に戻す操作を出し、押すと利用開始を空にする", async () => {
    renderView();

    expect(screen.queryByRole("button", { name: "利用開始を空欄に戻す" })).not.toBeInTheDocument();

    setDateTime("クーポンの利用開始", "2026-10-15T09:00");
    await userEvent.click(screen.getByRole("button", { name: "利用開始を空欄に戻す" }));

    expect(dateField("クーポンの利用開始")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "利用開始を空欄に戻す" })).not.toBeInTheDocument();
  });

  it("打ち始めると書きかけとして離れる操作を見張らせ、画面が無くなれば見張りを解く", async () => {
    const { rerender } = renderView();

    expect(guard.when).toBe(false);

    await userEvent.type(codeField(), "W");

    await waitFor(() => expect(guard.when).toBe(true));

    rerender(
      <UnsavedChangesGuard>
        <p>別の画面</p>
      </UnsavedChangesGuard>,
    );

    await waitFor(() => expect(guard.when).toBe(false));
  });

  // ----- 確認中 -----
  it("確認では、保存される綴りのコードと、打った日時・値引き・対象・上限を順に復唱する", async () => {
    renderView();

    await fillAll();
    const dialog = await openConfirmation();

    expect(dialog).toHaveAccessibleName("この内容でキャンペーンを定義しますか？");
    expect(summaryOf(dialog)).toEqual([
      ["キャンペーンコード", "WELCOME-2026"],
      ["値引き", "15% 引き（1 回 20 ドルまで）"],
      ["値引きの対象", "特定のカテゴリ：家電"],
      ["配布期間", "2026/10/01 00:00 〜 2026/11/30 23:59"],
      ["クーポンの有効期限", "2026/12/31 23:59"],
      ["クーポンの利用開始", "受け取った時点から"],
      ["上限", "総 1000 枚・1 人 1 枚まで"],
      ["最低購入額", "50 ドル以上"],
    ]);
  });

  it("利用開始を打てばその日時を、最低購入額が空なら「なし」を復唱する", async () => {
    renderView();

    await fillAll({ usableFrom: "2026-10-15T09:00", minPurchaseAmount: "" });
    const dialog = await openConfirmation();

    expect(detailOf(dialog, "クーポンの利用開始")).toBe("2026/10/15 09:00");
    expect(detailOf(dialog, "最低購入額")).toBe("なし");
  });

  it("上限額を空にした定率は、上限を添えずに復唱する", async () => {
    renderView();

    await fillAll();
    await userEvent.clear(screen.getByRole("textbox", { name: "上限額（ドル）" }));
    const dialog = await openConfirmation();

    expect(detailOf(dialog, "値引き")).toBe("15% 引き");
  });

  it("定額へ切り替えると、打った値を額として復唱する", async () => {
    renderView();

    await fillAll();
    await userEvent.click(screen.getByRole("radio", { name: "定額" }));
    const dialog = await openConfirmation();

    expect(detailOf(dialog, "値引き")).toBe("15 ドル引き");
  });

  it("全商品を選ぶと、対象を添えずに復唱する", async () => {
    renderView();

    await fillAll();
    await userEvent.click(screen.getByRole("radio", { name: "全商品" }));
    const dialog = await openConfirmation();

    expect(detailOf(dialog, "値引きの対象")).toBe("全商品");
  });

  it("特定の商品を選ぶと、選んだ商品の名前で復唱し、その識別子を送る", async () => {
    const action = sending();
    const [product] = FOUND_PRODUCTS.status === "found" ? FOUND_PRODUCTS.items : [];

    renderView(action);
    await fillAll();
    await userEvent.click(screen.getByRole("radio", { name: "特定の商品" }));
    await userEvent.click(screen.getByRole("button", { name: "商品" }));
    await userEvent.click(await screen.findByRole("option", { name: "ワイヤレスイヤホン" }));
    const dialog = await openConfirmation();

    expect(detailOf(dialog, "値引きの対象")).toBe("特定の商品：ワイヤレスイヤホン");

    await send(dialog);
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    expect(sent(action, 0).get("scopeProductId")).toBe(product?.id);
    expect(sent(action, 0).get("scopeCategoryId")).toBeNull();
  });

  it("確認を通った送信に、打った値・瞬間へ確定させた日時・冪等キー・確認の合図を載せる", async () => {
    const action = sending();

    renderView(action);
    await fillAndSend();
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    const formData = sent(action, 0);

    expect(formData.get("code")).toBe(FILLED_OWN_VALUES.code);
    expect(formData.get("startsAt")).toBe(new Date(FILLED_OWN_VALUES.startsAt).toISOString());
    expect(formData.get("endsAt")).toBe(new Date(FILLED_OWN_VALUES.endsAt).toISOString());
    expect(formData.get("couponExpiresAt")).toBe(
      new Date(FILLED_OWN_VALUES.couponExpiresAt).toISOString(),
    );
    expect(formData.get("usableFrom")).toBe("");
    expect(formData.get("totalLimit")).toBe("1000");
    expect(formData.get("perUserLimit")).toBe("1");
    expect(formData.get("minPurchaseAmount")).toBe("50");
    expect(formData.get("discountKind")).toBe("rate");
    expect(formData.get("discountValue")).toBe("15");
    expect(formData.get("discountMaxAmount")).toBe("20");
    expect(formData.get("scopeKind")).toBe("category");
    expect(formData.get("scopeCategoryId")).toBe(CAMPAIGN_CATEGORY_OPTIONS[0]?.value);
    expect(formData.get("scopeProductId")).toBeNull();
    expect(formData.get("idempotencyKey")).toMatch(/\S/);
    expect(formData.get("confirmed")).toBe(CAMPAIGN_CONFIRMED_VALUE);
  });

  it("定率から定額へ切り替えると、打ってあった上限額を送らない", async () => {
    const action = sending();

    renderView(action);
    await fillAll();
    await userEvent.click(screen.getByRole("radio", { name: "定額" }));
    await send(await openConfirmation());
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    expect(sent(action, 0).get("discountKind")).toBe("flat");
    expect(sent(action, 0).get("discountMaxAmount")).toBeNull();
  });

  it("カテゴリから全商品へ切り替えると、選んであったカテゴリを送らない", async () => {
    const action = sending();

    renderView(action);
    await fillAll();
    await userEvent.click(screen.getByRole("radio", { name: "全商品" }));
    await send(await openConfirmation());
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    expect(sent(action, 0).get("scopeKind")).toBe("all");
    expect(sent(action, 0).get("scopeCategoryId")).toBeNull();
  });

  it("確認をやめると閉じ、打った値を残して送らない", async () => {
    const action = sending();

    renderView(action);
    await fillAll();
    const dialog = await openConfirmation();

    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(codeField()).toHaveValue(FILLED_OWN_VALUES.code);
    expect(dateField("配布開始")).toHaveValue(FILLED_OWN_VALUES.startsAt);
    expect(action).not.toHaveBeenCalled();
  });

  it("確認を開き直すと、直前の失敗を下げる", async () => {
    renderView(sending(failedActionState({ formError: FORM_ERROR, kind: ErrorKind.VALIDATION })));

    const dialog = await fillAndSend();

    await within(dialog).findByText(FORM_ERROR);
    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));
    const reopened = await openConfirmation();

    expect(within(reopened).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("確認を開いた状態で a11y 検査を通る", async () => {
    const { baseElement } = renderView();

    await fillAll();
    await openConfirmation();

    expect((await axe(baseElement, AXE_OPTIONS)).violations).toEqual([]);
  });

  // ----- 送信中 -----
  it("送っているあいだは確認を開いたまま、送信の操作を押せなくする", async () => {
    const action = vi.fn<CreateCampaignAction>(
      () =>
        new Promise((resolve) => {
          settlePending = () => resolve(idleActionState());
        }),
    );

    renderView(action);
    const dialog = await fillAndSend();

    expect(await within(dialog).findByRole("button", { name: "定義しています…" })).toBeDisabled();
    expect(screen.getByRole("alertdialog")).toBe(dialog);
  });

  // ----- 欄の誤りで差し戻されたとき -----
  it("コードが既に使われていたら確認を閉じ、コードの欄に重複の文言を出す", async () => {
    renderView(sending(CONFLICTED));

    await fillAndSend();

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(codeField()).toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_CODE_CONFLICT_MESSAGE),
    );
  });

  it("コードの重複のあとは欄を止めず、打ち直したコードを別の冪等キーで送る", async () => {
    const action = sending(CONFLICTED);

    renderView(action);
    await fillAndSend();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    expect(screen.queryByText(LOCKED_MESSAGE)).not.toBeInTheDocument();
    expect(codeField()).toBeEnabled();

    await userEvent.clear(codeField());
    await userEvent.type(codeField(), "welcome-2027");
    await send(await openConfirmation());
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));

    expect(sent(action, 1).get("code")).toBe("welcome-2027");
    expect(sent(action, 1).get("idempotencyKey")).not.toBe(sent(action, 0).get("idempotencyKey"));
  });

  it("接続先が名指しした欄に返った文言を出し、確認を閉じる", async () => {
    renderView(
      sending(
        failedActionState({
          formError: null,
          fieldErrors: { couponExpiresAt: [EXPIRY_REJECTED] },
          kind: ErrorKind.VALIDATION,
        }),
      ),
    );

    await fillAndSend();

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(dateField("クーポンの有効期限")).toHaveAccessibleDescription(
      expect.stringContaining(EXPIRY_REJECTED),
    );
  });

  it("返った文言は、その欄を打ち直すと下げる", async () => {
    renderView(
      sending(
        failedActionState({
          formError: null,
          fieldErrors: { couponExpiresAt: [EXPIRY_REJECTED] },
          kind: ErrorKind.VALIDATION,
        }),
      ),
    );

    await fillAndSend();
    await screen.findByText(EXPIRY_REJECTED);
    setDateTime("クーポンの有効期限", "2027-01-31T23:59");

    expect(screen.queryByText(EXPIRY_REJECTED)).not.toBeInTheDocument();
  });

  it("同じ内容で送り直して同じ拒否が返れば、下げた文言をまた出す", async () => {
    const rejected = () =>
      failedActionState<never, "couponExpiresAt">({
        formError: null,
        fieldErrors: { couponExpiresAt: [EXPIRY_REJECTED] },
        kind: ErrorKind.VALIDATION,
      });

    renderView(sending(rejected(), rejected()));
    await fillAndSend();
    await screen.findByText(EXPIRY_REJECTED);

    const reopened = await openConfirmation();

    expect(screen.queryByText(EXPIRY_REJECTED)).not.toBeInTheDocument();

    await send(reopened);

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(dateField("クーポンの有効期限")).toHaveAccessibleDescription(
      expect.stringContaining(EXPIRY_REJECTED),
    );
  });

  // ----- 全体の文言だけが返ったとき -----
  it("欄を名指ししない拒否では確認を開いたまま、全体の文言を確認の中にだけ出す", async () => {
    renderView(sending(failedActionState({ formError: FORM_ERROR, kind: ErrorKind.VALIDATION })));

    const dialog = await fillAndSend();
    const alert = await within(dialog).findByRole("alert");

    expect(alert).toHaveTextContent("定義できませんでした");
    expect(alert).toHaveTextContent(FORM_ERROR);
    expect(screen.getByRole("alertdialog")).toBe(dialog);
    expect(screen.getAllByText(FORM_ERROR)).toHaveLength(1);
  });

  it("全体の文言も欄の誤りも無い失敗では、確認を開いたまま報せを出さない", async () => {
    const action = sending(failedActionState({ formError: null, kind: ErrorKind.VALIDATION }));

    renderView(action);
    const dialog = await fillAndSend();

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await within(dialog).findByRole("button", { name: "定義する" });

    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBe(dialog);
  });

  it("全体の文言と欄の誤りが両方返れば確認を閉じ、全体の文言は出さない", async () => {
    renderView(
      sending(
        failedActionState({
          formError: FORM_ERROR,
          fieldErrors: { couponExpiresAt: [EXPIRY_REJECTED] },
          kind: ErrorKind.VALIDATION,
        }),
      ),
    );

    await fillAndSend();

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByText(EXPIRY_REJECTED)).toBeInTheDocument();
    expect(screen.queryByText(FORM_ERROR)).not.toBeInTheDocument();
  });

  // ----- 結果が定まらない失敗のあと -----
  it("結果が定まらない失敗のあとは止めた理由を出し、欄を止めて、確認へ進む操作だけを残す", async () => {
    renderView(sending(UNAVAILABLE));

    const dialog = await fillAndSend({ usableFrom: "2026-10-15T09:00" });

    await within(dialog).findByText(FORM_ERROR);
    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));

    expect(screen.getByText(LOCKED_MESSAGE)).toBeInTheDocument();
    expect(codeField()).toBeDisabled();
    expect(dateField("配布開始")).toBeDisabled();
    expect(screen.getByRole("radio", { name: "定率" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "利用開始を空欄に戻す" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "内容を確認する" })).toBeEnabled();
  });

  it("止めたあとも確認を開け、1 回目と同じ冪等キーと同じ値で送り直す", async () => {
    const action = sending(UNAVAILABLE);

    renderView(action);
    const dialog = await fillAndSend();

    await within(dialog).findByText(FORM_ERROR);
    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));
    await userEvent.type(codeField(), "X");
    await send(await openConfirmation());
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));

    expect(sent(action, 1).get("idempotencyKey")).toBe(sent(action, 0).get("idempotencyKey"));
    expect([...sent(action, 1).entries()]).toEqual([...sent(action, 0).entries()]);
  });

  it("結果が定まらない失敗のあとの送り直しが 409 なら、確認の中にどちらとも読める文言を出し、欄を止めたまま同じ冪等キーで送り直す", async () => {
    const action = sending(UNAVAILABLE, CONFLICTED);

    renderView(action);
    const dialog = await fillAndSend();

    await within(dialog).findByText(FORM_ERROR);
    await send(dialog);
    await within(dialog).findByText(CAMPAIGN_RESEND_CONFLICT_MESSAGE);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(codeField()).not.toHaveAccessibleDescription(
      expect.stringContaining(CAMPAIGN_CODE_CONFLICT_MESSAGE),
    );
    expect(screen.getByText(LOCKED_MESSAGE)).toBeInTheDocument();
    expect(codeField()).toBeDisabled();

    await send(screen.getByRole("alertdialog"));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(3));

    expect(sent(action, 2).get("idempotencyKey")).toBe(sent(action, 0).get("idempotencyKey"));
  });

  it.each([
    ErrorKind.TOO_MANY_REQUESTS,
    ErrorKind.CANCELED,
    ErrorKind.UNAVAILABLE,
    ErrorKind.INTERNAL,
  ])("分類が %s の失敗は結果が定まらないため、欄を止める", async (kind) => {
    renderView(sending(failedActionState({ formError: FORM_ERROR, kind })));

    const dialog = await fillAndSend();

    await within(dialog).findByText(FORM_ERROR);

    expect(screen.getByText(LOCKED_MESSAGE)).toBeInTheDocument();
    expect(codeField()).toBeDisabled();
  });

  it.each([ErrorKind.VALIDATION, ErrorKind.CONFLICT, ErrorKind.INVALID_ARGUMENT])(
    "分類が %s の失敗は結果が定まっているため、欄を止めない",
    async (kind) => {
      renderView(sending(failedActionState({ formError: FORM_ERROR, kind })));

      const dialog = await fillAndSend();

      await within(dialog).findByText(FORM_ERROR);

      expect(screen.queryByText(LOCKED_MESSAGE)).not.toBeInTheDocument();
      expect(codeField()).toBeEnabled();
    },
  );

  it("分類を持たない失敗は送る前に止めたものとして、欄を止めない", async () => {
    renderView(sending(failedActionState({ formError: FORM_ERROR })));

    const dialog = await fillAndSend();

    await within(dialog).findByText(FORM_ERROR);

    expect(screen.queryByText(LOCKED_MESSAGE)).not.toBeInTheDocument();
    expect(codeField()).toBeEnabled();
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

    expect(sent(action, 1).get("idempotencyKey")).not.toBe(sent(action, 0).get("idempotencyKey"));
  });
});

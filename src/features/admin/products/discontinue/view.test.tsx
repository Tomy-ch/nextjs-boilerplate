// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";

import { ADMIN_PRODUCT_LIST_PATH, adminProductDiscontinuePath } from "../../paths";
import {
  COUPON_DISCOUNT_RATE_INVALID_MESSAGE,
  COUPON_VALIDITY_DAYS_INVALID_MESSAGE,
} from "./coupon-rules";
import {
  BLOCKED_IMPACT,
  DISCONTINUE_PRODUCT,
  DISCONTINUE_RESULT,
  DISCONTINUED_AT,
  OPEN_IMPACT,
} from "./discontinue.fixture";
import {
  DISCONTINUE_CONFLICT_MESSAGE,
  type DiscontinueProductAction,
  type DiscontinueProductState,
} from "./form-state";
import { AdminProductDiscontinueView, type AdminProductDiscontinueViewProps } from "./view";

const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-0000000000aa";
const REMAINING_MARKER = "残っている購入の区画";

const idle: DiscontinueProductAction = () => Promise.resolve(idleActionState());

/** 送られたら決まった結果を返す送信先。 */
function returning(state: DiscontinueProductState) {
  return vi.fn<DiscontinueProductAction>(() => Promise.resolve(state));
}

function props(
  overrides: Partial<AdminProductDiscontinueViewProps> = {},
): AdminProductDiscontinueViewProps {
  return {
    product: DISCONTINUE_PRODUCT,
    standing: { kind: "open", impact: OPEN_IMPACT },
    remainingPurchases: <p>{REMAINING_MARKER}</p>,
    discontinueAction: idle,
    idempotencyKey: IDEMPOTENCY_KEY,
    ...overrides,
  };
}

function renderView(overrides: Partial<AdminProductDiscontinueViewProps> = {}) {
  return render(<AdminProductDiscontinueView {...props(overrides)} />);
}

function rateField(): HTMLElement {
  return screen.getByRole("textbox", { name: "値引き率（%）" });
}

function daysField(): HTMLElement {
  return screen.getByRole("textbox", { name: "有効日数" });
}

/** 条件を打って確認を開く。 */
async function openConfirmation(rate = "10", days = "30"): Promise<HTMLElement> {
  await userEvent.type(rateField(), rate);
  await userEvent.type(daysField(), days);
  await userEvent.click(screen.getByRole("button", { name: "廃番にする" }));

  return screen.findByRole("alertdialog");
}

/** 確認を通って送る。 */
async function submit(rate?: string, days?: string): Promise<HTMLElement> {
  const dialog = await openConfirmation(rate, days);

  await userEvent.click(within(dialog).getByRole("button", { name: "廃番にする" }));

  return dialog;
}

describe("AdminProductDiscontinueView", () => {
  // ----- 実行できるとき -----
  it("見積もりと、空の条件の欄と、実行の入口を出す", () => {
    renderView();

    expect(screen.getByRole("heading", { name: "影響の見積もり" })).toBeInTheDocument();
    expect(rateField()).toHaveValue("");
    expect(daysField()).toHaveValue("");
    expect(screen.getByRole("button", { name: "廃番にする" })).toBeInTheDocument();
  });

  it("進行中の購入が無ければ、残っている購入の区画を出さない", () => {
    renderView();

    expect(screen.queryByText(REMAINING_MARKER)).not.toBeInTheDocument();
  });

  it("見積もりの取り直しを、この画面自身へ向ける", () => {
    renderView();

    expect(screen.getByRole("link", { name: "読み込み直す" })).toHaveAttribute(
      "href",
      adminProductDiscontinuePath(DISCONTINUE_PRODUCT.id),
    );
  });

  it("やめる導線を一覧へ向ける", () => {
    renderView();

    expect(screen.getByRole("link", { name: "キャンセル" })).toHaveAttribute(
      "href",
      ADMIN_PRODUCT_LIST_PATH,
    );
  });

  it("条件を打たずに実行の入口を押しても確認を開かず、両方の欄に誤りを出す", async () => {
    renderView();

    await userEvent.click(screen.getByRole("button", { name: "廃番にする" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(rateField()).toHaveAccessibleDescription(
      expect.stringContaining(COUPON_DISCOUNT_RATE_INVALID_MESSAGE),
    );
    expect(daysField()).toHaveAccessibleDescription(
      expect.stringContaining(COUPON_VALIDITY_DAYS_INVALID_MESSAGE),
    );
  });

  it("読めない欄があるうちは確認を開かず、その欄だけに誤りを出す", async () => {
    renderView();

    await userEvent.type(rateField(), "10%");
    await userEvent.type(daysField(), "30");
    await userEvent.click(screen.getByRole("button", { name: "廃番にする" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(rateField()).toHaveAccessibleDescription(
      expect.stringContaining(COUPON_DISCOUNT_RATE_INVALID_MESSAGE),
    );
    expect(daysField()).not.toHaveAccessibleDescription(
      expect.stringContaining(COUPON_VALIDITY_DAYS_INVALID_MESSAGE),
    );
  });

  it("条件を打ち直すと、確認を開く前に出した誤りを下げる", async () => {
    renderView();

    await userEvent.click(screen.getByRole("button", { name: "廃番にする" }));
    await userEvent.type(rateField(), "1");

    expect(rateField()).not.toHaveAccessibleDescription(
      expect.stringContaining(COUPON_DISCOUNT_RATE_INVALID_MESSAGE),
    );
  });

  it("条件が読めれば、商品の名前を見出しにした確認を開く", async () => {
    renderView();

    expect(await openConfirmation()).toHaveAccessibleName(
      `${DISCONTINUE_PRODUCT.name} を廃番にしますか？`,
    );
  });

  it("確認をやめても、打った条件を残す", async () => {
    renderView();

    const dialog = await openConfirmation("12.5", "30");

    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(rateField()).toHaveValue("12.5");
    expect(daysField()).toHaveValue("30");
  });

  it("確認を通った送信に、対象・冪等キー・打った条件・確認の合図を載せる", async () => {
    const action = returning(idleActionState());

    renderView({ discontinueAction: action });
    await submit("12.5", "30");

    const sent = action.mock.calls[0]?.[1];

    expect(sent?.get("productId")).toBe(DISCONTINUE_PRODUCT.id);
    expect(sent?.get("idempotencyKey")).toBe(IDEMPOTENCY_KEY);
    expect(sent?.get("couponDiscountRate")).toBe("12.5");
    expect(sent?.get("couponValidityDays")).toBe("30");
    expect(sent?.get("confirmed")).toBe("true");
  });

  it("取り直しで別の冪等キーが届いても、最初の鍵で送る", async () => {
    const action = returning(idleActionState());
    const { rerender } = renderView({ discontinueAction: action });

    rerender(
      <AdminProductDiscontinueView
        {...props({
          discontinueAction: action,
          idempotencyKey: "0195f0c2-0000-7000-8000-0000000000bb",
        })}
      />,
    );
    await submit();

    expect(action.mock.calls[0]?.[1].get("idempotencyKey")).toBe(IDEMPOTENCY_KEY);
  });

  it("成立したら確認を閉じ、見積もりではなく実行の応答の件数を確認の外に出す", async () => {
    renderView({ discontinueAction: returning(succeededActionState(DISCONTINUE_RESULT)) });

    await submit();

    const result = await screen.findByRole("alert");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(result).toHaveTextContent("廃番にしました");
    expect(result).toHaveTextContent(`${DISCONTINUE_RESULT.affectedCartCount} 件`);
    expect(result).not.toHaveTextContent(`${OPEN_IMPACT.affectedCartCount} 件`);
  });

  it("成立した後に廃番済みの姿へ取り直されても、結果を残す", async () => {
    const action = returning(succeededActionState(DISCONTINUE_RESULT));
    const { rerender } = renderView({ discontinueAction: action });

    await submit();
    await screen.findByText("廃番にしました");

    rerender(
      <AdminProductDiscontinueView
        {...props({
          discontinueAction: action,
          standing: { kind: "discontinued", discontinuedAt: DISCONTINUED_AT },
        })}
      />,
    );

    expect(screen.getByText("廃番にしました")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "廃番済み" })).toBeInTheDocument();
  });

  it("進行中の購入が残って拒まれたら確認を閉じ、理由を確認の外に出す", async () => {
    renderView({
      discontinueAction: returning(
        failedActionState({ formError: DISCONTINUE_CONFLICT_MESSAGE, kind: ErrorKind.CONFLICT }),
      ),
    });

    await submit();

    const feedback = await screen.findByRole("alert");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(feedback).toHaveTextContent("廃番にできませんでした");
    expect(feedback).toHaveTextContent(DISCONTINUE_CONFLICT_MESSAGE);
  });

  it("拒まれた後に進行中の購入がある姿へ取り直されても、理由を残して購入を並べる", async () => {
    const action = returning(
      failedActionState({ formError: DISCONTINUE_CONFLICT_MESSAGE, kind: ErrorKind.CONFLICT }),
    );
    const { rerender } = renderView({ discontinueAction: action });

    await submit();
    await screen.findByText(DISCONTINUE_CONFLICT_MESSAGE);

    rerender(
      <AdminProductDiscontinueView
        {...props({
          discontinueAction: action,
          standing: { kind: "open", impact: BLOCKED_IMPACT },
        })}
      />,
    );

    expect(screen.getByText(DISCONTINUE_CONFLICT_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(REMAINING_MARKER)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "廃番にする" })).not.toBeInTheDocument();
  });

  it("全体の文言の無い拒否では、確認の外に報せを出さない", async () => {
    renderView({
      discontinueAction: returning(
        failedActionState({ formError: null, kind: ErrorKind.CONFLICT }),
      ),
    });

    await submit();

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByText("廃番にできませんでした")).not.toBeInTheDocument();
  });

  it("条件を接続先に拒まれたら確認を開いたまま中に文言を出し、その欄のそばにも出す", async () => {
    const message = "値引き率は受け付けられませんでした。入力し直してください。";

    renderView({
      discontinueAction: returning(
        failedActionState({
          formError: null,
          fieldErrors: { couponDiscountRate: [message] },
          kind: ErrorKind.VALIDATION,
        }),
      ),
    });

    const dialog = await submit();

    expect(await within(dialog).findByText(message)).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBe(dialog);

    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));

    expect(rateField()).toHaveAccessibleDescription(expect.stringContaining(message));
  });

  it("接続先に拒まれた後に条件を打ち直すと、その欄に残っていた拒否の文言を下げる", async () => {
    const message = "値引き率は受け付けられませんでした。入力し直してください。";

    renderView({
      discontinueAction: returning(
        failedActionState({
          formError: null,
          fieldErrors: { couponDiscountRate: [message] },
          kind: ErrorKind.VALIDATION,
        }),
      ),
    });

    const dialog = await submit();

    await within(dialog).findByText(message);
    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));
    await userEvent.type(rateField(), "1");

    expect(rateField()).not.toHaveAccessibleDescription(expect.stringContaining(message));
  });

  it("一時的に受け付けられなかったら、確認を開いたまま中に文言を出す", async () => {
    renderView({
      discontinueAction: returning(
        failedActionState({ formError: "混み合っています。", kind: ErrorKind.UNAVAILABLE }),
      ),
    });

    const dialog = await submit();

    expect(await within(dialog).findByText("混み合っています。")).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBe(dialog);
  });

  it("確認を開き直すと、直前の失敗を下げる", async () => {
    renderView({
      discontinueAction: returning(
        failedActionState({ formError: "混み合っています。", kind: ErrorKind.UNAVAILABLE }),
      ),
    });

    const dialog = await submit();

    await within(dialog).findByText("混み合っています。");
    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));
    await userEvent.click(screen.getByRole("button", { name: "廃番にする" }));

    const reopened = await screen.findByRole("alertdialog");

    expect(within(reopened).queryByText("混み合っています。")).not.toBeInTheDocument();
  });

  it("結果が無いうちは、結果も失敗の報せも出さない", () => {
    renderView();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("実行できるときの a11y 検査を通る", async () => {
    const { container } = renderView();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("結果を出した状態で a11y 検査を通る", async () => {
    const { container } = renderView({
      discontinueAction: returning(succeededActionState(DISCONTINUE_RESULT)),
    });

    await submit();
    await screen.findByText("廃番にしました");

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- 進行中の購入が残っているとき -----
  it("実行の入口と条件の欄を出さず、残っている購入の区画を出す", () => {
    renderView({ standing: { kind: "open", impact: BLOCKED_IMPACT } });

    expect(screen.getByText(REMAINING_MARKER)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "廃番にする" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "値引き率（%）" })).not.toBeInTheDocument();
  });

  // ----- 既に廃番のとき -----
  it("廃番済みであることと一覧へ戻る導線だけを出し、見積もりも実行の入口も出さない", () => {
    renderView({ standing: { kind: "discontinued", discontinuedAt: DISCONTINUED_AT } });

    expect(screen.getByRole("heading", { name: "廃番済み" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "商品一覧へ戻る" })).toHaveAttribute(
      "href",
      ADMIN_PRODUCT_LIST_PATH,
    );
    expect(screen.queryByRole("heading", { name: "影響の見積もり" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "廃番にする" })).not.toBeInTheDocument();
    expect(screen.queryByText(REMAINING_MARKER)).not.toBeInTheDocument();
  });
});

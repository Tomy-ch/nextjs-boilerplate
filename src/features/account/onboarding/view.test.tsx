// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { failedActionState, idleActionState } from "@/model/action-state";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";
import { toSafeReturnUrl } from "@/model/return-url";

const { fetchAddresses, registerAction } = vi.hoisted(() => ({
  fetchAddresses: vi.fn(),
  registerAction: vi.fn(),
}));

vi.mock("@/adapters/client/api/addresses", () => ({ fetchAddresses }));
vi.mock("../actions", () => ({ registerAction }));

import { ADDRESS_LOOKUP, PREFECTURES, PROFILE } from "../account.fixture";
import { RETURN_URL_FIELD } from "./parse-registration-form";
import { OnboardingView } from "./view";

const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-00000000000f";

function renderView() {
  return render(
    <OnboardingView
      idempotencyKey={IDEMPOTENCY_KEY}
      prefectures={PREFECTURES}
      returnUrl={toSafeReturnUrl("/mypage")}
    />,
  );
}

/** 項目名で入力欄を引いて値を入れる。 */
function fill(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.blur(screen.getByLabelText(label));
}

/** 基本情報の段を埋める。 */
function fillBasics(): void {
  fill("名字", PROFILE.lastName);
  fill("名前", PROFILE.firstName);
  fill("メールアドレス", PROFILE.email);
  fill("電話番号", PROFILE.phone);
}

/** 住所の段を埋める。 */
function fillAddress(): void {
  fill("郵便番号", PROFILE.postalCode);
  fill("都道府県", PROFILE.prefecture);
  fill("市区町村", PROFILE.city);
  fill("丁目・番地", PROFILE.street);
}

/** 段を進める。 */
async function goNext(name: string): Promise<void> {
  const next = await screen.findByRole("button", { name });

  await waitFor(() => expect(next).toBeEnabled());
  fireEvent.click(next);
}

beforeEach(() => {
  fetchAddresses.mockReset().mockResolvedValue(ADDRESS_LOOKUP);
  registerAction.mockReset().mockResolvedValue(idleActionState());
});

describe("OnboardingView", () => {
  // ----- 正常系 -----
  it("開いた直後は最初の段だけを見せる", () => {
    renderView();

    expect(screen.getByLabelText("名字")).toBeVisible();
    expect(screen.getByLabelText("郵便番号")).not.toBeVisible();
  });

  it("段を埋めると次へ進める", async () => {
    renderView();
    fillBasics();
    await goNext("次へ");

    expect(await screen.findByLabelText("郵便番号")).toBeVisible();
  });

  it("最後の段では、進む操作が送信の操作に替わる", async () => {
    renderView();
    fillBasics();
    await goNext("次へ");
    fillAddress();
    await goNext("確認へ進む");

    expect(await screen.findByRole("button", { name: "登録する" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "確認へ進む" })).not.toBeInTheDocument();
  });

  it("見えていない段の入力も含めて 1 度で送る", async () => {
    renderView();
    fillBasics();
    await goNext("次へ");
    fillAddress();
    await goNext("確認へ進む");
    fireEvent.click(await screen.findByRole("button", { name: "登録する" }));

    await waitFor(() => expect(registerAction).toHaveBeenCalledOnce());

    const formData = registerAction.mock.calls[0]?.[1];

    expect(formData.get("lastName")).toBe(PROFILE.lastName);
    expect(formData.get("city")).toBe(PROFILE.city);
  });

  it("この登録 1 回ぶんの鍵と戻り先を送信に載せる", async () => {
    renderView();
    fillBasics();
    await goNext("次へ");
    fillAddress();
    await goNext("確認へ進む");
    fireEvent.click(await screen.findByRole("button", { name: "登録する" }));

    await waitFor(() => expect(registerAction).toHaveBeenCalledOnce());

    const formData = registerAction.mock.calls[0]?.[1];

    expect(formData.get(IDEMPOTENCY_KEY_FIELD)).toBe(IDEMPOTENCY_KEY);
    expect(formData.get(RETURN_URL_FIELD)).toBe("/mypage");
  });

  // ----- 異常系 -----
  it("埋まっていない段からは進めない", () => {
    renderView();

    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });

  it("必須が 1 つ欠けているだけでも進めない", () => {
    renderView();
    fill("名字", PROFILE.lastName);
    fill("名前", PROFILE.firstName);
    fill("メールアドレス", PROFILE.email);

    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });

  it("登録できなかった理由をフォームの先頭に出す", async () => {
    registerAction.mockResolvedValue(
      failedActionState({ formError: "すでに登録が済んでいます。" }),
    );
    renderView();
    fillBasics();
    await goNext("次へ");
    fillAddress();
    await goNext("確認へ進む");
    fireEvent.click(await screen.findByRole("button", { name: "登録する" }));

    expect(await screen.findByText("すでに登録が済んでいます。")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderView();

    expect((await axe(container)).violations).toEqual([]);
  });
});

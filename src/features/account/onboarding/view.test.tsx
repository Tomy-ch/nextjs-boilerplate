// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
import { RETURN_URL_FIELD } from "./form-names";
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

type User = ReturnType<typeof userEvent.setup>;

/** 基本情報の段を埋める。 */
async function fillBasics(user: User): Promise<void> {
  await user.type(screen.getByLabelText("名字"), PROFILE.lastName);
  await user.type(screen.getByLabelText("名前"), PROFILE.firstName);
  await user.type(screen.getByLabelText("メールアドレス"), PROFILE.email);
  await user.type(screen.getByLabelText("電話番号"), PROFILE.phone);
}

/**
 * 住所の段を埋める。
 *
 * @remarks
 * 郵便番号から focus が外れた時点で補完が走り、都道府県と市区町村には値が入ります。**利用者が
 * 実際に打つのと同じ順で触るため、補完が埋めた欄はいったん空にしてから入れ直します。** 追記に
 * すると、補完の結果と入力が二重になります。
 */
async function fillAddress(user: User): Promise<void> {
  await user.type(screen.getByLabelText("郵便番号"), PROFILE.postalCode);
  await user.selectOptions(screen.getByLabelText("都道府県"), PROFILE.prefecture);

  const city = screen.getByLabelText("市区町村");

  await user.clear(city);
  await user.type(city, PROFILE.city);
  await user.type(screen.getByLabelText("丁目・番地"), PROFILE.street);
}

/** 段を進める。押せるようになるまで待ってから押す。 */
async function goNext(user: User, name: string): Promise<void> {
  const next = await screen.findByRole("button", { name });

  await waitFor(() => expect(next).toBeEnabled());
  await user.click(next);
}

/** 確認の段まで進める。 */
async function goToConfirm(user: User): Promise<void> {
  await fillBasics(user);
  await goNext(user, "次へ");
  await fillAddress(user);
  await goNext(user, "確認へ進む");
}

beforeEach(() => {
  fetchAddresses.mockReset().mockResolvedValue(ADDRESS_LOOKUP);
  registerAction.mockReset().mockResolvedValue(idleActionState());
});

describe("OnboardingView", () => {
  it("開いた直後は最初の段だけを見せる", () => {
    renderView();

    expect(screen.getByLabelText("名字")).toBeVisible();
    expect(screen.getByLabelText("郵便番号")).not.toBeVisible();
  });

  it("段を埋めると次へ進める", async () => {
    const user = userEvent.setup();

    renderView();
    await fillBasics(user);
    await goNext(user, "次へ");

    expect(await screen.findByLabelText("郵便番号")).toBeVisible();
  });

  it("最後の段では、進む操作が送信の操作に替わる", async () => {
    const user = userEvent.setup();

    renderView();
    await goToConfirm(user);

    expect(await screen.findByRole("button", { name: "登録する" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "確認へ進む" })).not.toBeInTheDocument();
  });

  it("見えていない段の入力も含めて 1 度で送る", async () => {
    const user = userEvent.setup();

    renderView();
    await goToConfirm(user);
    await user.click(await screen.findByRole("button", { name: "登録する" }));

    await waitFor(() => expect(registerAction).toHaveBeenCalledOnce());

    const formData = registerAction.mock.calls[0]?.[1];

    expect(formData.get("lastName")).toBe(PROFILE.lastName);
    expect(formData.get("city")).toBe(PROFILE.city);
  });

  it("この登録 1 回ぶんの鍵と戻り先を送信に載せる", async () => {
    const user = userEvent.setup();

    renderView();
    await goToConfirm(user);
    await user.click(await screen.findByRole("button", { name: "登録する" }));

    await waitFor(() => expect(registerAction).toHaveBeenCalledOnce());

    const formData = registerAction.mock.calls[0]?.[1];

    expect(formData.get(IDEMPOTENCY_KEY_FIELD)).toBe(IDEMPOTENCY_KEY);
    expect(formData.get(RETURN_URL_FIELD)).toBe("/mypage");
  });

  it("画面を取り直しても、送信に載る鍵を変えない", () => {
    const { container, rerender } = renderView();

    rerender(
      <OnboardingView
        idempotencyKey="0195f0c2-0000-7000-8000-0000000000ff"
        prefectures={PREFECTURES}
        returnUrl={toSafeReturnUrl("/mypage")}
      />,
    );

    expect(container.querySelector(`[name="${IDEMPOTENCY_KEY_FIELD}"]`)).toHaveValue(
      IDEMPOTENCY_KEY,
    );
  });

  it("埋まっていない段からは進めない", () => {
    renderView();

    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });

  it("必須が 1 つ欠けているだけでも進めない", async () => {
    const user = userEvent.setup();

    renderView();
    await user.type(screen.getByLabelText("名字"), PROFILE.lastName);
    await user.type(screen.getByLabelText("名前"), PROFILE.firstName);
    await user.type(screen.getByLabelText("メールアドレス"), PROFILE.email);

    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });

  it("登録できなかった理由をフォームの先頭に出す", async () => {
    const user = userEvent.setup();

    registerAction.mockResolvedValue(
      failedActionState({ formError: "すでに登録が済んでいます。" }),
    );
    renderView();
    await goToConfirm(user);
    await user.click(await screen.findByRole("button", { name: "登録する" }));

    expect(await screen.findByText("すでに登録が済んでいます。")).toBeVisible();
  });

  it("項目ごとの誤りだけの失敗では、フォームの先頭にバナーを出さない", async () => {
    const user = userEvent.setup();

    registerAction.mockResolvedValue(
      failedActionState({ fieldErrors: { email: ["メールアドレスの形式が正しくありません。"] } }),
    );
    renderView();
    await goToConfirm(user);
    await user.click(await screen.findByRole("button", { name: "登録する" }));

    await waitFor(() => expect(registerAction).toHaveBeenCalledOnce());

    expect(screen.queryByText("登録できませんでした")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderView();

    expect((await axe(container)).violations).toEqual([]);
  });
});

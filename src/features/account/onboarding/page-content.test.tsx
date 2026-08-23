// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent as User } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toSafeReturnUrl } from "@/model/return-url";

const { getPrefectures, newIdempotencyKey } = vi.hoisted(() => ({
  getPrefectures: vi.fn(),
  newIdempotencyKey: vi.fn(),
}));

vi.mock("@/adapters/server/api/prefectures", () => ({ getPrefectures }));
vi.mock("@/model/idempotency-key", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/model/idempotency-key")>()),
  newIdempotencyKey,
}));

import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

import { PREFECTURES } from "../account.fixture";
import { PROFILE_FIELD_LABELS } from "../field-labels";
import { RETURN_URL_FIELD } from "./form-names";
import { OnboardingPageContent } from "./page-content";

const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-00000000000f";

async function renderContent(returnUrl = "/mypage") {
  return render(await OnboardingPageContent({ returnUrl: toSafeReturnUrl(returnUrl) }));
}

const BASICS_LABELS = [
  PROFILE_FIELD_LABELS.lastName,
  PROFILE_FIELD_LABELS.firstName,
  PROFILE_FIELD_LABELS.email,
  PROFILE_FIELD_LABELS.phone,
];

const ADDRESS_LABELS = [
  PROFILE_FIELD_LABELS.postalCode,
  PROFILE_FIELD_LABELS.prefecture,
  PROFILE_FIELD_LABELS.city,
  PROFILE_FIELD_LABELS.street,
  PROFILE_FIELD_LABELS.building,
];

/** 住所の段まで進める。名前の段が埋まるまで「次へ」は押せない。 */
async function goToAddress(user: User): Promise<void> {
  await user.type(screen.getByLabelText("名字"), "山田");
  await user.type(screen.getByLabelText("名前"), "太郎");
  await user.type(screen.getByLabelText("メールアドレス"), "taro@example.com");
  await user.type(screen.getByLabelText("電話番号"), "09012345678");

  const next = await screen.findByRole("button", { name: "次へ" });

  await waitFor(() => expect(next).toBeEnabled());
  await user.click(next);
}

beforeEach(() => {
  getPrefectures.mockReset().mockResolvedValue(PREFECTURES);
  newIdempotencyKey.mockReset().mockReturnValue(IDEMPOTENCY_KEY);
});

describe("OnboardingPageContent", () => {
  it("都道府県マスタを取って選択肢へ配る", async () => {
    const { container } = await renderContent();

    await goToAddress(userEvent.setup());

    expect(within(screen.getByLabelText("都道府県")).getAllByRole("option")).toHaveLength(
      PREFECTURES.length,
    );
    expect(container.querySelector(`[name="${IDEMPOTENCY_KEY_FIELD}"]`)).toHaveValue(
      IDEMPOTENCY_KEY,
    );
  });

  it("まだ登録が無いので、名前の段は空で開く", async () => {
    await renderContent();

    for (const label of BASICS_LABELS) {
      expect(screen.getByLabelText(label)).toHaveValue("");
    }
  });

  it("まだ登録が無いので、住所の段も空で開く", async () => {
    await renderContent();

    await goToAddress(userEvent.setup());

    for (const label of ADDRESS_LABELS) {
      if (label === PROFILE_FIELD_LABELS.prefecture) {
        // 候補から選ぶ項目には既定の選択を置かない。選んでいないことと、先頭の候補を
        // 選んだことは別である。
        expect(screen.getByLabelText(label)).not.toHaveValue();
        continue;
      }

      expect(screen.getByLabelText(label)).toHaveValue("");
    }
  });

  it("この画面を組み立てるたびに、登録 1 回ぶんの鍵を 1 つ作る", async () => {
    await renderContent();

    expect(newIdempotencyKey).toHaveBeenCalledOnce();
  });

  it("受け取った戻り先をそのまま送信へ載せる", async () => {
    const { container } = await renderContent("/checkout");

    expect(container.querySelector(`[name="${RETURN_URL_FIELD}"]`)).toHaveValue("/checkout");
  });
});

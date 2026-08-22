// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
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

beforeEach(() => {
  getPrefectures.mockReset().mockResolvedValue(PREFECTURES);
  newIdempotencyKey.mockReset().mockReturnValue(IDEMPOTENCY_KEY);
});

describe("OnboardingPageContent", () => {
  it("都道府県マスタを取って選択肢へ配る", async () => {
    const { container } = await renderContent();

    // 都道府県は住所の段にあり、開いた直後は隠れている。取得した候補が配られたことは、
    // 見えているかどうかとは別に確かめる。
    expect(
      within(screen.getByLabelText("都道府県")).getAllByRole("option", { hidden: true }),
    ).toHaveLength(PREFECTURES.length);
    expect(container.querySelector(`[name="${IDEMPOTENCY_KEY_FIELD}"]`)).toHaveValue(
      IDEMPOTENCY_KEY,
    );
  });

  it("まだ登録が無いので、どの項目も空で開く", async () => {
    await renderContent();

    for (const [field, label] of Object.entries(PROFILE_FIELD_LABELS)) {
      if (field === "prefecture") {
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

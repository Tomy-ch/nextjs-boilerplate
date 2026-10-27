// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getManagedUser, getProductCategories, notFound } = vi.hoisted(() => ({
  getManagedUser: vi.fn(),
  getProductCategories: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/adapters/server/api/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/users")>()),
  getManagedUser,
}));
vi.mock("@/adapters/server/api/product-masters", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/adapters/server/api/product-masters")>()),
  getProductCategories,
}));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("./view", () => ({
  AdminUserCouponNewView: (props: { recipient: unknown; categoryOptions: unknown }) => (
    <output>
      {JSON.stringify({ recipient: props.recipient, options: props.categoryOptions })}
    </output>
  ),
}));

import { createAppError, findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { idleActionState } from "@/model/action-state";
import type { ManagedUser } from "@/model/user/user";

import { ISSUE_RECIPIENT } from "./coupon-new.fixture";
import type { IssueCouponAction } from "./form-state";
import { AdminUserCouponNewPageContent } from "./page-content";

const USER: ManagedUser = {
  id: ISSUE_RECIPIENT.id,
  lastName: "山田",
  firstName: "太郎",
  email: ISSUE_RECIPIENT.email,
  phone: "090-0000-0000",
  deletedAt: null,
};

const issueAction: IssueCouponAction = () => Promise.resolve(idleActionState());

function assemble() {
  return AdminUserCouponNewPageContent({ id: ISSUE_RECIPIENT.id, issueAction });
}

function passed(): { recipient: unknown; options: unknown } {
  return JSON.parse(screen.getByRole("status").textContent ?? "");
}

beforeEach(() => {
  vi.clearAllMocks();
  getManagedUser.mockResolvedValue(USER);
  getProductCategories.mockResolvedValue([
    { id: "category-1", name: "家電", code: 1 },
    { id: "category-2", name: "雑貨", code: 2 },
  ]);
});

describe("AdminUserCouponNewPageContent", () => {
  // ----- 揃ったとき -----
  it("動的セグメントが指す利用者を取り、発行先として氏名・メールアドレス・退会の有無を渡す", async () => {
    render(await assemble());

    expect(getManagedUser).toHaveBeenCalledExactlyOnceWith(ISSUE_RECIPIENT.id);
    expect(passed().recipient).toEqual(ISSUE_RECIPIENT);
  });

  it("退会した利用者は、退会済みの発行先として渡す", async () => {
    getManagedUser.mockResolvedValue({ ...USER, deletedAt: "2026-09-01T00:00:00.000Z" });

    render(await assemble());

    expect(passed().recipient).toEqual({ ...ISSUE_RECIPIENT, withdrawn: true });
  });

  it("カテゴリのマスタを、識別子を値に・名前を表示にした候補へ直して並び順のまま渡す", async () => {
    render(await assemble());

    expect(getProductCategories).toHaveBeenCalledTimes(1);
    expect(passed().options).toEqual([
      { value: "category-1", label: "家電" },
      { value: "category-2", label: "雑貨" },
    ]);
  });

  it("送信先を受け取ったまま画面へ渡す", async () => {
    const element = await assemble();

    expect(element.props.issueAction).toBe(issueAction);
  });

  // ----- 取得に失敗したとき -----
  it("見つからない利用者は not-found の境界へ渡す", async () => {
    getManagedUser.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));

    await expect(assemble()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("見つからない以外の利用者の取得の失敗は、not-found にせず分類のまま投げ直す", async () => {
    getManagedUser.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    await expect(assemble()).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.UNAVAILABLE,
    );
    expect(notFound).not.toHaveBeenCalled();
  });

  it("カテゴリのマスタの取得の失敗は握り潰さず、境界へ渡す", async () => {
    getProductCategories.mockRejectedValue(new Error("取得に失敗しました"));

    await expect(assemble()).rejects.toThrow("取得に失敗しました");
    expect(notFound).not.toHaveBeenCalled();
  });
});

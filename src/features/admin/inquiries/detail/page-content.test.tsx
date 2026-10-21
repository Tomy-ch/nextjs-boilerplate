// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getInquiryHistory, notFound } = vi.hoisted(() => ({
  getInquiryHistory: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/adapters/server/api/inquiries", () => ({ getInquiryHistory }));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("./view", () => ({
  AdminInquiryDetailView: ({
    history,
    inquiryId,
  }: {
    history: { messages: readonly { id: string }[] };
    inquiryId: string;
  }) => (
    <p>
      {inquiryId}:{history.messages.map((message) => message.id).join(",")}
    </p>
  ),
}));

import { createAppError, findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { idleActionState } from "@/model/action-state";

import { ADMIN_INQUIRY_HISTORY, ADMIN_INQUIRY_ID } from "../inquiries.fixture";
import { AdminInquiryDetailPageContent } from "./page-content";

beforeEach(() => {
  vi.clearAllMocks();
  getInquiryHistory.mockResolvedValue(ADMIN_INQUIRY_HISTORY);
});

describe("AdminInquiryDetailPageContent", () => {
  it("動的セグメントが指す問い合わせを取る", async () => {
    render(
      await AdminInquiryDetailPageContent({
        inquiryId: ADMIN_INQUIRY_ID,
        replyAction: async () => idleActionState<void, "body">(),
      }),
    );

    expect(getInquiryHistory).toHaveBeenCalledWith(ADMIN_INQUIRY_ID);
    expect(screen.getByText(ADMIN_INQUIRY_ID, { exact: false })).toBeVisible();
  });

  it("取った正本を、そのまま画面へ渡す", async () => {
    render(
      await AdminInquiryDetailPageContent({
        inquiryId: ADMIN_INQUIRY_ID,
        replyAction: async () => idleActionState<void, "body">(),
      }),
    );

    const ids = ADMIN_INQUIRY_HISTORY.messages.map((message) => message.id).join(",");

    expect(screen.getByText(`${ADMIN_INQUIRY_ID}:${ids}`)).toBeVisible();
  });

  it("見つからない問い合わせは not-found の境界へ渡す", async () => {
    getInquiryHistory.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));

    await expect(
      AdminInquiryDetailPageContent({
        inquiryId: ADMIN_INQUIRY_ID,
        replyAction: async () => idleActionState<void, "body">(),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("見つからない以外の失敗は分類のまま投げ直す", async () => {
    getInquiryHistory.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    await expect(
      AdminInquiryDetailPageContent({
        inquiryId: ADMIN_INQUIRY_ID,
        replyAction: async () => idleActionState<void, "body">(),
      }),
    ).rejects.toSatisfy((error: unknown) => findAppError(error)?.kind === ErrorKind.UNAVAILABLE);
    expect(notFound).not.toHaveBeenCalled();
  });
});

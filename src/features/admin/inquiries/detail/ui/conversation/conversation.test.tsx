// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { InquiryFeedEvent } from "@/adapters/client/api/inquiries";
import type { UseStreamOptions } from "@/adapters/client/stream/use-stream";
import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";
import type { InquiryId } from "@/model/inquiry/inquiry";

const { useStream, refresh, useOnlineStatus } = vi.hoisted(() => ({
  useStream: vi.fn(),
  refresh: vi.fn(),
  useOnlineStatus: vi.fn(() => true),
}));

vi.mock("@/adapters/client/stream/use-stream", () => ({ useStream }));
vi.mock("@/capabilities/use-online-status", () => ({ useOnlineStatus }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import {
  ADMIN_INQUIRY_HISTORY,
  ADMIN_INQUIRY_ID,
  OTHER_INQUIRY_ID,
} from "../../../inquiries.fixture";
import { AdminInquiryConversation } from "./conversation";

const replyAction = vi.fn(async () => idleActionState<void, "body">());

let opened: UseStreamOptions<InquiryFeedEvent> | null = null;

function lastOptions(): UseStreamOptions<InquiryFeedEvent> {
  if (opened === null) {
    throw new Error("購読が開かれていません。");
  }

  return opened;
}

function feedEvent(inquiryId: InquiryId): InquiryFeedEvent {
  return {
    type: "inquiry.thread.updated.v1",
    payload: {
      inquiryId,
      userId: "550e8400-e29b-41d4-a716-446655440000",
      sequence: 5,
      updatedAt: "2026-09-12T03:31:04.043410674+09:00",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  opened = null;
  useOnlineStatus.mockReturnValue(true);
  useStream.mockImplementation((options: UseStreamOptions<InquiryFeedEvent>) => {
    opened = options;

    return { state: { kind: "open" }, resume: vi.fn() };
  });
});

describe("AdminInquiryConversation", () => {
  it("取得した正本を並べる", () => {
    render(
      <AdminInquiryConversation
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );

    expect(screen.getByText(ADMIN_INQUIRY_HISTORY.messages[0]?.body ?? "")).toBeVisible();
  });

  it("開いている問い合わせが動いたら、正本を取り直す", () => {
    render(
      <AdminInquiryConversation
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );

    act(() => lastOptions().onEvents([feedEvent(ADMIN_INQUIRY_ID)]));

    expect(refresh).toHaveBeenCalledOnce();
  });

  it("別の問い合わせの更新では取り直さない", () => {
    render(
      <AdminInquiryConversation
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );

    act(() => lastOptions().onEvents([feedEvent(OTHER_INQUIRY_ID)]));

    expect(refresh).not.toHaveBeenCalled();
  });

  it("取り直しを求められたときも取り直す", () => {
    render(
      <AdminInquiryConversation
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );

    act(() => lastOptions().onResync());

    expect(refresh).toHaveBeenCalledOnce();
  });

  it("回答欄を出す", () => {
    render(
      <AdminInquiryConversation
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );

    expect(screen.getByLabelText("回答")).toBeInTheDocument();
  });

  it("受信の状態を出す", () => {
    render(
      <AdminInquiryConversation
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );

    expect(screen.getByRole("status")).toHaveAttribute("data-status", "receiving");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <AdminInquiryConversation
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });

  it("項目に紐づかない失敗を、回答欄の隣で知らせる", async () => {
    const user = userEvent.setup();

    replyAction.mockResolvedValue(
      failedActionState({ formError: "しばらくしてからお試しください。" }),
    );
    render(
      <AdminInquiryConversation
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );
    await user.type(screen.getByLabelText("回答"), "承知しました。");
    await user.click(screen.getByRole("button", { name: "回答する" }));

    expect(await screen.findByText("回答を送信できませんでした")).toBeVisible();
    expect(screen.getByText("しばらくしてからお試しください。")).toBeVisible();
  });

  it("回答が成立したら、次の 1 通は別の鍵で飛ばす", async () => {
    const user = userEvent.setup();

    replyAction.mockResolvedValue(succeededActionState(undefined));

    const { container } = render(
      <AdminInquiryConversation
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );
    const keyOf = () =>
      container.querySelector<HTMLInputElement>('input[name="idempotencyKey"]')?.value ?? "";
    const before = keyOf();

    await user.type(screen.getByLabelText("回答"), "承知しました。");
    await user.click(screen.getByRole("button", { name: "回答する" }));

    expect(keyOf()).not.toBe(before);
  });

  it("回答が拒まれて結果が定まったら、書き直した 1 通は別の鍵で飛ばす", async () => {
    const user = userEvent.setup();

    replyAction.mockResolvedValue(
      failedActionState({ formError: "送れません", kind: ErrorKind.VALIDATION }),
    );

    const { container } = render(
      <AdminInquiryConversation
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );
    const keyOf = () =>
      container.querySelector<HTMLInputElement>('input[name="idempotencyKey"]')?.value ?? "";
    const before = keyOf();

    await user.type(screen.getByLabelText("回答"), "承知しました。");
    await user.click(screen.getByRole("button", { name: "回答する" }));
    await screen.findByText("送れません");
    await user.type(screen.getByLabelText("回答"), "追記");

    expect(keyOf()).not.toBe(before);
    expect(screen.getByLabelText("回答")).toHaveValue("承知しました。追記");
  });

  it("結果が定まらない失敗のあとは、同じ鍵のまま送り直させ、本文を書き換えさせない", async () => {
    const user = userEvent.setup();

    replyAction.mockResolvedValue(
      failedActionState({ formError: "送れません", kind: ErrorKind.UNAVAILABLE }),
    );

    const { container } = render(
      <AdminInquiryConversation
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );
    const keyOf = () =>
      container.querySelector<HTMLInputElement>('input[name="idempotencyKey"]')?.value ?? "";
    const before = keyOf();

    await user.type(screen.getByLabelText("回答"), "承知しました。");
    await user.click(screen.getByRole("button", { name: "回答する" }));
    await screen.findByText("送れません");
    await user.type(screen.getByLabelText("回答"), "追記");

    expect(keyOf()).toBe(before);
    expect(screen.getByLabelText("回答")).toHaveValue("承知しました。");
  });
});

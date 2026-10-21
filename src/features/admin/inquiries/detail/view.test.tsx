// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { formatDateTime } from "@/model/datetime";

vi.mock("./ui/conversation/conversation", () => ({
  AdminInquiryConversation: () => <p>やり取り</p>,
}));

import { idleActionState } from "@/model/action-state";

import { ADMIN_INQUIRY_HISTORY, ADMIN_INQUIRY_ID } from "../inquiries.fixture";

const replyAction = async () => idleActionState<void, "body">();

import { AdminInquiryDetailView } from "./view";

describe("AdminInquiryDetailView", () => {
  it("やり取りを画面の本体として出す", () => {
    render(
      <AdminInquiryDetailView
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );

    expect(screen.getByText("やり取り")).toBeVisible();
  });

  it("一覧と突き合わせられるよう、問い合わせの識別子を出す", () => {
    render(
      <AdminInquiryDetailView
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );

    expect(screen.getByText(ADMIN_INQUIRY_ID)).toBeVisible();
  });

  it("画面の名前を、見えない見出しとして置く", () => {
    render(
      <AdminInquiryDetailView
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "問い合わせの対応" })).toHaveClass(
      "sr-only",
    );
  });

  it("やり取りの始まりを出す", () => {
    render(
      <AdminInquiryDetailView
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );

    expect(screen.getByText("開始")).toBeVisible();
    expect(
      screen.getByText(formatDateTime(ADMIN_INQUIRY_HISTORY.messages[0]?.createdAt ?? new Date())),
    ).toBeVisible();
  });

  it("1 通も無ければ、始まりの代わりにその旨を出す", () => {
    render(
      <AdminInquiryDetailView
        history={{ ...ADMIN_INQUIRY_HISTORY, messages: [] }}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );

    expect(screen.getByText("まだやり取りがありません")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <AdminInquiryDetailView
        history={ADMIN_INQUIRY_HISTORY}
        inquiryId={ADMIN_INQUIRY_ID}
        replyAction={replyAction}
      />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});

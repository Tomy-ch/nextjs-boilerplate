// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { idleActionState } from "@/model/action-state";
import { SESSION_ROLE, type Session } from "@/model/session";

import type { DevSessionFormState, DiscardSessionFormState } from "./form-state";
import { DevSessionView } from "./view";

const SESSION: Session = {
  userId: "dev-user",
  role: SESSION_ROLE.admin,
  expiresAt: new Date("2026-08-18T12:00:00+09:00"),
};

const actions = {
  discardAction: vi.fn(async (): Promise<DiscardSessionFormState> => idleActionState()),
  issueAction: vi.fn(async (): Promise<DevSessionFormState> => idleActionState()),
};

describe("DevSessionView", () => {
  it("いまの状態を先に置き、発行の指定を後に置く", () => {
    render(
      <DevSessionView
        {...actions}
        authorization={null}
        connectsLiveApi={false}
        defaultIssuer="https://idp.example.test"
        returnUrl="/"
        session={SESSION}
      />,
    );

    const current = screen.getByText("いまの session");
    const issuing = screen.getByText("session を発行する");

    expect(current.compareDocumentPosition(issuing)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("受け取った送信先を両方の操作へ配る", () => {
    render(
      <DevSessionView
        {...actions}
        authorization={null}
        connectsLiveApi={false}
        defaultIssuer="https://idp.example.test"
        returnUrl="/checkout"
        session={SESSION}
      />,
    );

    expect(screen.getByRole("button", { name: "session を捨てる" })).toBeVisible();
    expect(screen.getByRole("button", { name: "この内容で入る" })).toBeVisible();
  });
  it("session を持っていなくても発行の指定は出す", () => {
    render(
      <DevSessionView
        {...actions}
        authorization={null}
        connectsLiveApi={false}
        defaultIssuer="https://idp.example.test"
        returnUrl="/"
        session={null}
      />,
    );

    expect(screen.getByText("いま session は持っていません。")).toBeVisible();
    expect(screen.getByRole("button", { name: "この内容で入る" })).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <DevSessionView
        {...actions}
        authorization={null}
        connectsLiveApi={false}
        defaultIssuer="https://idp.example.test"
        returnUrl="/"
        session={SESSION}
      />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});

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
  // ----- 正常系 -----
  it("いまの状態を先に置き、発行の指定を後に置く", () => {
    const { container } = render(<DevSessionView {...actions} returnUrl="/" session={SESSION} />);

    const titles = [...container.querySelectorAll('[data-slot="card-title"]')].map(
      (title) => title.textContent,
    );

    expect(titles).toEqual(["いまの session", "session を発行する"]);
  });

  it("受け取った送信先を両方の操作へ配る", () => {
    render(<DevSessionView {...actions} returnUrl="/checkout" session={SESSION} />);

    expect(screen.getByRole("button", { name: "session を捨てる" })).toBeVisible();
    expect(screen.getByRole("button", { name: "この内容で入る" })).toBeVisible();
  });

  // ----- 異常系 -----
  it("session を持っていなくても発行の指定は出す", () => {
    render(<DevSessionView {...actions} returnUrl="/" session={null} />);

    expect(screen.getByText("いま session は持っていません。")).toBeVisible();
    expect(screen.getByRole("button", { name: "この内容で入る" })).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<DevSessionView {...actions} returnUrl="/" session={SESSION} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { LoadingAnnouncerProvider } from "@/components/shell/loading-announcer/loading-announcer";
import {
  ANNOUNCE_LOADING_AFTER_MS,
  LOADING_ANNOUNCEMENT,
} from "@/components/shell/loading-announcer/loading-announcer.definition";

import { AdminUserCouponNewSkeleton } from "./skeleton";

afterEach(() => {
  vi.useRealTimers();
});

describe("AdminUserCouponNewSkeleton", () => {
  it("待機の枠を支援技術へ読ませない", () => {
    const { container } = render(<AdminUserCouponNewSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("出ているあいだが長引けば、読み込んでいることを読み上げの通知へ載せる", () => {
    vi.useFakeTimers();

    render(
      <LoadingAnnouncerProvider>
        <AdminUserCouponNewSkeleton />
      </LoadingAnnouncerProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(ANNOUNCE_LOADING_AFTER_MS);
    });

    expect(screen.getByRole("status")).toHaveTextContent(LOADING_ANNOUNCEMENT.LOADING);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<AdminUserCouponNewSkeleton />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

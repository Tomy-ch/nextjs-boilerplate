// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StoryErrorBoundary } from "./story-error-boundary";

/** 描画のたびに投げる部品。`message` を渡さなければ Error 以外を投げる。 */
function Thrower({ message }: { message?: string }) {
  throw message === undefined ? "文字列の例外" : new Error(message);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("StoryErrorBoundary", () => {
  it("例外が出ていなければ中身をそのまま描く", () => {
    render(
      <StoryErrorBoundary>
        <p>story の中身</p>
      </StoryErrorBoundary>,
    );

    expect(screen.getByText("story の中身")).toBeVisible();
  });

  it("例外を受け止め、起きたことを文言と印として残す", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { container } = render(
      <StoryErrorBoundary>
        <Thrower message="config を読めませんでした" />
      </StoryErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByText("config を読めませんでした")).toBeVisible();
    expect(container.querySelector("[data-story-error]")).toBeInTheDocument();
  });

  it("Error でないものが投げられても、その値を文言に出す", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <StoryErrorBoundary>
        <Thrower />
      </StoryErrorBoundary>,
    );

    expect(screen.getByText("文字列の例外")).toBeVisible();
  });

  it("受け止めたことを console にも残す", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <StoryErrorBoundary>
        <Thrower message="落ちました" />
      </StoryErrorBoundary>,
    );

    expect(logged).toHaveBeenCalledWith("[story-error]", expect.any(Error), expect.any(String));
  });
});

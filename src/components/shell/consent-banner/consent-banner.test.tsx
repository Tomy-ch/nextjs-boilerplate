// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CONSENT_CHOICE } from "@/model/consent";
import { ConsentBanner } from "./consent-banner";
import { CONSENT_BANNER_COPY } from "./consent-banner.definition";

describe("ConsentBanner", () => {
  it("同意の操作を押すと、許した意思を返す", async () => {
    const onDecide = vi.fn();
    render(<ConsentBanner onDecide={onDecide} open />);

    await userEvent.click(screen.getByRole("button", { name: CONSENT_BANNER_COPY.accept }));

    expect(onDecide).toHaveBeenCalledWith(CONSENT_CHOICE.granted);
  });

  it("拒否の操作を押すと、許さない意思を返す", async () => {
    const onDecide = vi.fn();
    render(<ConsentBanner onDecide={onDecide} open />);

    await userEvent.click(screen.getByRole("button", { name: CONSENT_BANNER_COPY.reject }));

    expect(onDecide).toHaveBeenCalledWith(CONSENT_CHOICE.denied);
  });

  it("2 つの選択肢を同じ大きさで並べる。拒否だけを小さくしない", () => {
    render(<ConsentBanner onDecide={vi.fn()} open />);

    const accept = screen.getByRole("button", { name: CONSENT_BANNER_COPY.accept });
    const reject = screen.getByRole("button", { name: CONSENT_BANNER_COPY.reject });
    const sizeOf = (button: HTMLElement) =>
      button.className.split(" ").filter((name) => /^h-\d/.test(name));

    expect(sizeOf(reject)).toEqual(sizeOf(accept));
    expect(sizeOf(accept)).not.toHaveLength(0);
  });

  it("尋ねていない間は面を描かない", () => {
    render(<ConsentBanner onDecide={vi.fn()} open={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("判断の材料を示す文書への導線を添える", () => {
    render(<ConsentBanner onDecide={vi.fn()} open policyHref="/privacy" />);

    expect(screen.getByRole("link", { name: CONSENT_BANNER_COPY.policy })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  it("示す文書が無ければ導線そのものを出さない", () => {
    render(<ConsentBanner onDecide={vi.fn()} open />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("Escape では閉じず、意思も返さない", async () => {
    const onDecide = vi.fn();
    render(<ConsentBanner onDecide={onDecide} open />);

    await userEvent.keyboard("{Escape}");

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(onDecide).not.toHaveBeenCalled();
  });

  it("面の外を押しても閉じず、意思も返さない", async () => {
    const onDecide = vi.fn();
    render(<ConsentBanner onDecide={onDecide} open />);

    await userEvent.click(document.body);

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(onDecide).not.toHaveBeenCalled();
  });

  it("閉じる操作を置かない。選ぶこと以外に面から出る手段が無い", () => {
    render(<ConsentBanner onDecide={vi.fn()} open policyHref="/privacy" />);

    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("読み上げのための名前と説明を持つ", () => {
    render(<ConsentBanner onDecide={vi.fn()} open />);

    expect(screen.getByRole("dialog", { name: CONSENT_BANNER_COPY.title })).toBeVisible();
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
      CONSENT_BANNER_COPY.description,
    );
  });

  it("支援技術から見て問題を持たない", async () => {
    const { container } = render(<ConsentBanner onDecide={vi.fn()} open policyHref="/privacy" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});

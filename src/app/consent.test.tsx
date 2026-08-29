// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CONSENT_BANNER_COPY } from "@/components/shell/consent-banner/consent-banner.definition";
import { CONSENT_COOKIE_NAME } from "@/model/consent";

/** ゲートの先に置く資材。同意が無い間は DOM に現れてはならない。 */
const GATED = <script data-testid="gated" src="https://analytics.example.com/tag.js" />;

/**
 * 島を読み込み直す。
 *
 * @remarks
 * 同意状態は module の読み込み時に一度だけ cookie から作られる。作り直さないと、前のケースで
 * 選んだ意思が次のケースへ残る。
 */
async function loadIsland() {
  vi.resetModules();

  return (await import("./consent")).Consent;
}

afterEach(() => {
  document.cookie = `${CONSENT_COOKIE_NAME}=; max-age=0; path=/`;
});

describe("Consent", () => {
  it("まだ選ばれていなければ尋ねる", async () => {
    const Consent = await loadIsland();

    render(<Consent />);

    expect(screen.getByRole("dialog", { name: CONSENT_BANNER_COPY.title })).toBeVisible();
  });

  it("同意が無い間は、ゲートの先の資材を DOM へ置かない", async () => {
    const Consent = await loadIsland();

    render(<Consent>{GATED}</Consent>);

    expect(document.querySelector('[data-testid="gated"]')).toBeNull();
  });

  it("同意すると、ゲートの先の資材を読み込む", async () => {
    const Consent = await loadIsland();
    render(<Consent>{GATED}</Consent>);

    await userEvent.click(screen.getByRole("button", { name: CONSENT_BANNER_COPY.accept }));

    expect(document.querySelector('[data-testid="gated"]')).not.toBeNull();
  });

  it("拒否すると、尋ねるのをやめたうえで資材を読み込まない", async () => {
    const Consent = await loadIsland();
    render(<Consent>{GATED}</Consent>);

    await userEvent.click(screen.getByRole("button", { name: CONSENT_BANNER_COPY.reject }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelector('[data-testid="gated"]')).toBeNull();
  });

  it("a11y 違反を持たない", async () => {
    const Consent = await loadIsland();

    const { container } = render(<Consent>{GATED}</Consent>);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("同意状態を知らないサーバ側では、尋ねも読み込みもしない", async () => {
    const Consent = await loadIsland();

    expect(renderToStaticMarkup(<Consent>{GATED}</Consent>)).toBe("");
  });
});

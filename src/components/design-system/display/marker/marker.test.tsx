// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Marker, MarkerContent, MarkerIcon } from "./marker";
import { MARKER_VARIANT } from "./marker.definition";

describe("Marker", () => {
  it("既定では区切りを持たない div として注釈を表示する", () => {
    render(
      <Marker>
        <MarkerContent>最終更新 2026-08-03</MarkerContent>
      </Marker>,
    );

    const marker = screen.getByText("最終更新 2026-08-03").closest("[data-slot='marker']");

    expect(marker?.tagName).toBe("DIV");
    expect(marker).toHaveAttribute("data-variant", MARKER_VARIANT.DEFAULT);
  });

  it("variant を data 属性として公開し、呼び出し元と subcomponent から参照できる", () => {
    render(
      <Marker data-testid="marker" variant={MARKER_VARIANT.SEPARATOR}>
        <MarkerContent>ここまで表示しました</MarkerContent>
      </Marker>,
    );

    expect(screen.getByTestId("marker")).toHaveAttribute("data-variant", MARKER_VARIANT.SEPARATOR);
  });

  it("border でも同じ内容を表示し、variant だけが変わる", () => {
    render(
      <Marker data-testid="marker" variant={MARKER_VARIANT.BORDER}>
        <MarkerContent>補足</MarkerContent>
      </Marker>,
    );

    expect(screen.getByTestId("marker")).toHaveAttribute("data-variant", MARKER_VARIANT.BORDER);
    expect(screen.getByText("補足")).toHaveAttribute("data-slot", "marker-content");
  });

  it("アイコンは装飾として支援技術から隠す", () => {
    render(
      <Marker>
        <MarkerIcon data-testid="icon">
          <svg aria-label="時計" role="img" />
        </MarkerIcon>
        <MarkerContent>最終更新 2026-08-03</MarkerContent>
      </Marker>,
    );

    expect(screen.getByTestId("icon")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img", { name: "時計" })).not.toBeInTheDocument();
  });

  it("既定では role を持たず、読み上げ順に注釈のテキストだけを残す", () => {
    render(
      <Marker>
        <MarkerContent>ここまで表示しました</MarkerContent>
      </Marker>,
    );

    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("ここまで表示しました")).toBeVisible();
  });

  it("asChild で見出し要素へ合成し、区切りへ意味論を与えられる", () => {
    render(
      <Marker asChild variant={MARKER_VARIANT.BORDER}>
        <h3>
          <MarkerContent>補足</MarkerContent>
        </h3>
      </Marker>,
    );

    const heading = screen.getByRole("heading", { name: "補足" });

    expect(heading).toHaveAttribute("data-slot", "marker");
    expect(heading).toHaveAttribute("data-variant", MARKER_VARIANT.BORDER);
  });

  it("本文の link を操作可能な要素として保つ", () => {
    render(
      <Marker>
        <MarkerContent>
          詳しい条件は<Link href="/terms">利用条件</Link>を確認してください。
        </MarkerContent>
      </Marker>,
    );

    expect(screen.getByRole("link", { name: "利用条件" })).toHaveAttribute("href", "/terms");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <Marker variant={MARKER_VARIANT.SEPARATOR}>
        <MarkerIcon>
          <svg />
        </MarkerIcon>
        <MarkerContent>ここまで表示しました</MarkerContent>
      </Marker>,
    );

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("MarkerIcon", () => {
  // ----- 正常系 -----
  it("印の枠として slot を持つ要素を描画する", () => {
    const { container } = render(
      <Marker>
        <MarkerIcon />
        <MarkerContent>補足</MarkerContent>
      </Marker>,
    );

    expect(container.querySelector('[data-slot="marker-icon"]')).not.toBeNull();
  });
});

describe("MarkerContent", () => {
  // ----- 正常系 -----
  it("本文として slot を持つ要素を描画する", () => {
    render(
      <Marker>
        <MarkerContent>補足</MarkerContent>
      </Marker>,
    );

    expect(screen.getByText("補足")).toHaveAttribute("data-slot", "marker-content");
  });
});

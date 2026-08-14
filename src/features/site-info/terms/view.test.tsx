// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ABOUT_PATH, PRIVACY_PATH } from "../facade/paths/paths";
import { TermsView } from "./view";

describe("TermsView", () => {
  it("閲覧そのものが同意になることを冒頭で断る", () => {
    render(<TermsView />);

    expect(screen.getByText("閲覧した時点で同意したものとみなします")).toBeVisible();
  });

  it.each([
    { heading: "セキュリティについて" },
    { heading: "入力する情報について" },
    { heading: "サービスの提供について" },
    { heading: "やめてほしいこと" },
    { heading: "免責" },
  ] as const)("$heading の節を見出しつきで出す", ({ heading }) => {
    render(<TermsView />);

    expect(screen.getByRole("heading", { name: heading })).toBeVisible();
  });

  it("免責の本文をここに持つ", () => {
    render(<TermsView />);

    expect(screen.getByText(/利用した結果として生じたいかなる損害/)).toBeVisible();
  });

  it("侵入が起きても連絡しないことを述べる", () => {
    render(<TermsView />);

    expect(screen.getByText(/こちらから連絡することはありません/)).toBeVisible();
  });

  it("保存先の詳細をプライバシーポリシーへ渡す", () => {
    render(<TermsView />);

    expect(screen.getByRole("link", { name: "プライバシーポリシー" })).toHaveAttribute(
      "href",
      PRIVACY_PATH,
    );
  });

  it("何が動かないかを このサイトについて へ渡す", () => {
    render(<TermsView />);

    expect(screen.getByRole("link", { name: "このサイトについて" })).toHaveAttribute(
      "href",
      ABOUT_PATH,
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<TermsView />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

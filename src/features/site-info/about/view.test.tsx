// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { TERMS_PATH } from "../facade/paths/paths";
import { AboutView } from "./view";

describe("AboutView", () => {
  it("実在の取引と取り違えられないよう冒頭で断る", () => {
    render(<AboutView />);

    expect(screen.getByText("サンプルサイトです")).toBeVisible();
  });

  it.each([
    { heading: "何のためのサイトか" },
    { heading: "何で出来ているか" },
    { heading: "動かないもの" },
    { heading: "メンテナンスについて" },
    { heading: "利用にあたって" },
  ] as const)("$heading の節を見出しつきで出す", ({ heading }) => {
    render(<AboutView />);

    expect(screen.getByRole("heading", { name: heading })).toBeVisible();
  });

  it("何で出来ているかの節にリポジトリのカードを置く", () => {
    render(<AboutView />);

    expect(screen.getByRole("link", { name: "nextjs-boilerplate" })).toBeVisible();
    expect(screen.getByRole("link", { name: "go-boilerplate" })).toBeVisible();
  });

  it("利用規約への導線を持つ", () => {
    render(<AboutView />);

    expect(screen.getByRole("link", { name: "利用規約を読む" })).toHaveAttribute(
      "href",
      TERMS_PATH,
    );
  });

  it("免責の本文を持たず、利用規約へ寄せる", () => {
    render(<AboutView />);

    expect(screen.queryByText(/責任を負いません/)).not.toBeInTheDocument();
    expect(screen.queryByText(/保証しません/)).not.toBeInTheDocument();
  });

  it("閲覧の同意条件を持たず、利用規約へ寄せる", () => {
    render(<AboutView />);

    expect(screen.queryByText(/同意したものとみなす/)).not.toBeInTheDocument();
    expect(screen.getByText(/閲覧の条件と免責は、利用規約にまとめてあります/)).toBeVisible();
  });

  it("予告なくメンテナンスを行うことがあると伝える", () => {
    render(<AboutView />);

    expect(screen.getByText("予告なくメンテナンスを行うことがあります。")).toBeVisible();
  });

  it("設計上の呼び名を利用者向けの文言に出さない", () => {
    render(<AboutView />);

    expect(screen.queryByText(/プレゼンテーション層|アーキテクチャ/)).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<AboutView />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

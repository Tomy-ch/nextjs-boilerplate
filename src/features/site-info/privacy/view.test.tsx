// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PrivacyView } from "./view";

describe("PrivacyView", () => {
  it("入力する前に読める位置で偽名を使うよう求める", () => {
    render(<PrivacyView />);

    expect(screen.getByText("本物の個人情報を入力しないでください")).toBeVisible();
  });

  it("起動のしかたごとに保存先が変わることを見出しで示す", () => {
    render(<PrivacyView />);

    expect(screen.getByRole("heading", { name: "入力した情報がどこに残るか" })).toBeVisible();
  });

  it.each([
    { heading: "1. 自分で clone して Go 側と繋いでいる場合" },
    { heading: "2. 自分で clone してモックのまま動かしている場合" },
    { heading: "3. 公開されているサンプルサイトを見ている場合" },
  ] as const)("$heading の保存先を出す", ({ heading }) => {
    render(<PrivacyView />);

    expect(screen.getByRole("heading", { name: heading })).toBeVisible();
  });

  it("追跡と第三者提供を行わないことを述べる", () => {
    render(<PrivacyView />);

    expect(screen.getByRole("heading", { name: "追跡と第三者提供" })).toBeVisible();
  });

  it("保存先の見出しを、節の見出しより下の階層に置く", () => {
    render(<PrivacyView />);

    expect(
      screen.getByRole("heading", { level: 2, name: "入力した情報がどこに残るか" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "2. 自分で clone してモックのまま動かしている場合",
      }),
    ).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<PrivacyView />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

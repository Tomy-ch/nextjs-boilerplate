// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PROFILE } from "../../../account.fixture";
import { PROFILE_EDIT_PATH } from "../../../paths";
import { ProfileCard } from "./profile-card";

describe("ProfileCard", () => {
  it("名字と名前を続けて 1 つの氏名として出す", () => {
    render(<ProfileCard profile={PROFILE} />);

    expect(screen.getByText("山田 太郎")).toBeVisible();
  });

  it("メールアドレスと電話番号をそのまま出す", () => {
    render(<ProfileCard profile={PROFILE} />);

    expect(screen.getByText(PROFILE.email)).toBeVisible();
    expect(screen.getByText(PROFILE.phone)).toBeVisible();
  });

  it("郵便番号を先頭に置いて住所を 1 行へ組む", () => {
    render(<ProfileCard profile={PROFILE} />);

    expect(
      screen.getByText("〒150-0001 東京都 渋谷区 神宮前 1-2-3 パークサイドレジデンス 1201"),
    ).toBeVisible();
  });

  it("建物名が無いとき区切りごと落とす", () => {
    render(<ProfileCard profile={{ ...PROFILE, building: null }} />);

    expect(screen.getByText("〒150-0001 東京都 渋谷区 神宮前 1-2-3")).toBeVisible();
  });

  it("編集への導線をこのカードが持つ", () => {
    render(<ProfileCard profile={PROFILE} />);

    expect(screen.getByRole("link", { name: "編集する" })).toHaveAttribute(
      "href",
      PROFILE_EDIT_PATH,
    );
  });

  it("項目名と値を対にして読めるようにする", () => {
    render(<ProfileCard profile={PROFILE} />);

    for (const label of ["氏名", "メールアドレス", "電話番号", "住所"]) {
      expect(screen.getByText(label)).toBeVisible();
    }
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ProfileCard profile={PROFILE} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

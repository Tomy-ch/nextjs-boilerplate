// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ToastProvider } from "@/components/shell/toaster/toaster";

import { PREFECTURES, PROFILE } from "../account.fixture";
import { MYPAGE_PATH } from "../paths";
import { ProfileEditView } from "./view";

/** 保存の成功は toast で伝えるため、shell が載せる Provider をここでも被せる。 */
function renderView() {
  return render(
    <ToastProvider>
      <ProfileEditView prefectures={PREFECTURES} profile={PROFILE} />
    </ToastProvider>,
  );
}

describe("ProfileEditView", () => {
  it("受け取ったプロフィールを入力欄の初期値としてフォームへ渡す", () => {
    renderView();

    expect(screen.getByLabelText("名字")).toHaveValue("山田");
  });

  it("受け取った都道府県をフォームの選択肢へ渡す", () => {
    renderView();

    expect(within(screen.getByLabelText("都道府県")).getAllByRole("option")).toHaveLength(
      PREFECTURES.length,
    );
  });

  it("global nav から 1 手で戻れない祖先をパンくずで示す", () => {
    renderView();

    expect(screen.getByRole("link", { name: "マイページ" })).toHaveAttribute("href", MYPAGE_PATH);
  });

  it("現在地を link にせず、パンくずの末尾に置く", () => {
    renderView();

    expect(screen.getByText("プロフィール編集")).not.toHaveAttribute("href");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderView();

    expect((await axe(container)).violations).toEqual([]);
  });
});

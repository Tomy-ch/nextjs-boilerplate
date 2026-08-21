// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { idleActionState } from "@/model/action-state";
import type { UserProfile } from "@/model/user/user";

import { PROFILE } from "../../../account.fixture";
import { useProfileFields } from "../../../use-profile-fields";
import { RegistrationConfirmSection } from "./confirm-section";

/**
 * 入力済みの値を購読させる。
 *
 * @remarks
 * `useProfileFields` へ初期値を渡すのは、この部品が読むのが「いま入力されている値」だからです。
 * 実際の画面では前の段で入力した値がそこに載っています。
 */
function Probe({ profile }: { profile: UserProfile }) {
  const fields = useProfileFields(profile, idleActionState());

  return <RegistrationConfirmSection control={fields.control} />;
}

describe("RegistrationConfirmSection", () => {
  it("送る値を項目名とともに並べる", () => {
    render(<Probe profile={PROFILE} />);

    expect(screen.getByText("名字")).toBeVisible();
    expect(screen.getByText("山田")).toBeVisible();
    expect(screen.getByText("taro.yamada@example.com")).toBeVisible();
  });

  it("尋ねた順のまま読み返せるようにする", () => {
    render(<Probe profile={PROFILE} />);

    const labels = screen.getAllByRole("term").map((term) => term.textContent);

    expect(labels).toEqual([
      "名字",
      "名前",
      "メールアドレス",
      "電話番号",
      "郵便番号",
      "都道府県",
      "市区町村",
      "丁目・番地",
      "建物名・部屋番号",
    ]);
  });

  it("入力欄を持たない", () => {
    render(<Probe profile={PROFILE} />);

    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("任意入力が空でも行を消さず、空であることを読ませる", () => {
    render(<Probe profile={{ ...PROFILE, building: null }} />);

    expect(screen.getByText("建物名・部屋番号")).toBeVisible();
    expect(screen.getByText("未入力")).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Probe profile={PROFILE} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

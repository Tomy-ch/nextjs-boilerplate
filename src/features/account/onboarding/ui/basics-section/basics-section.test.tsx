// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { idleActionState } from "@/model/action-state";

import { useProfileFields } from "../../../use-profile-fields";
import { RegistrationBasicsSection } from "./basics-section";

/**
 * 入力欄の配線を実物のまま渡す。
 *
 * @remarks
 * `useProfileFields` を差し替えないのは、この部品が持つのが「どの項目をどう並べるか」だけで、
 * 配線を偽物にすると label と control の対応まで偽物になるためです。
 */
function Probe() {
  const fields = useProfileFields(null, idleActionState());

  return <RegistrationBasicsSection fields={fields} />;
}

describe("RegistrationBasicsSection", () => {
  // ----- 正常系 -----
  it("名前と連絡先の項目を、項目名で引ける形で並べる", () => {
    render(<Probe />);

    for (const label of ["名字", "名前", "メールアドレス", "電話番号"]) {
      expect(screen.getByLabelText(label)).toBeVisible();
    }
  });

  it("登録が無いので、どの項目も空で開く", () => {
    render(<Probe />);

    expect(screen.getByLabelText("名字")).toHaveValue("");
  });

  it("必須であることを control が伝える", () => {
    render(<Probe />);

    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("aria-required", "true");
  });

  it("入力の種類を control が伝える", () => {
    render(<Probe />);

    expect(screen.getByLabelText("メールアドレス")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("電話番号")).toHaveAttribute("inputmode", "tel");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Probe />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

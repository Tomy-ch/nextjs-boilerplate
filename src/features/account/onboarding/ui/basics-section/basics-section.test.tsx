// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { idleActionState } from "@/model/action-state";

import { PROFILE_FIELD_LABELS } from "../../../field-labels";
import { useProfileFields } from "../../../use-profile-fields";
import { BASICS_FIELDS } from "../../steps";
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
  it("名前と連絡先の項目を、項目名で引ける形で並べる", () => {
    render(<Probe />);

    for (const label of ["名字", "名前", "メールアドレス", "電話番号"]) {
      expect(screen.getByLabelText(label)).toBeVisible();
    }
  });

  it("登録が無いので、この段のどの項目も空で開く", () => {
    render(<Probe />);

    for (const field of BASICS_FIELDS) {
      expect(screen.getByLabelText(PROFILE_FIELD_LABELS[field])).toHaveValue("");
    }
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

  it("メールが連絡先であって認証の identity ではないことを添える", () => {
    render(<Probe />);

    expect(screen.getByText(/認証に使う ID ではない/)).toBeVisible();
  });

  it("他の項目には補足を付けない", () => {
    render(<Probe />);

    expect(screen.queryByText(/連絡のための宛先です。/)).toBeInTheDocument();
    expect(screen.getAllByText(/宛先です。/)).toHaveLength(1);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Probe />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

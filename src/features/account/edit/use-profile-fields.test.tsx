// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { failedActionState, idleActionState } from "@/model/action-state";
import type { ProfileField } from "@/model/user/profile-schema";
import type { UserProfile } from "@/model/user/user";

import { PROFILE } from "../account.fixture";
import type { ProfileFormState } from "../form-state";
import { useProfileFields } from "./use-profile-fields";

/** 2 項目ぶんの入力欄と、組まれた props をそのまま描画する。 */
function Probe({
  fields = ["lastName", "building"],
  profile = PROFILE,
  state = idleActionState<void, ProfileField>(),
}: {
  fields?: readonly ProfileField[];
  profile?: UserProfile;
  state?: ProfileFormState;
}) {
  const profileFields = useProfileFields(profile, state);

  return (
    <div>
      {fields.map((field) => {
        const props = profileFields.fieldOf(field);

        return (
          <div key={field}>
            <label htmlFor={props.controlId}>{field}</label>
            <input id={props.controlId} {...props.registration} />
            <p data-testid={`${field}-message`}>{props.message ?? ""}</p>
            <p data-testid={`${field}-required`}>{props.required ? "必須" : "任意"}</p>
            <p data-testid={`${field}-error-id`}>{props.errorId}</p>
          </div>
        );
      })}
      <p data-testid="two-ids">
        {profileFields.fieldOf("lastName").controlId ===
        profileFields.fieldOf("firstName").controlId
          ? "同じ"
          : "別"}
      </p>
    </div>
  );
}

describe("useProfileFields", () => {
  it("受け取ったプロフィールを入力欄の初期値にする", () => {
    render(<Probe />);

    expect(screen.getByLabelText("lastName")).toHaveValue("山田");
  });

  it("建物名を持つプロフィールはその値を初期値にする", () => {
    render(<Probe />);

    expect(screen.getByLabelText("building")).toHaveValue(PROFILE.building);
  });

  it("建物名が無いとき空欄を初期値にする", () => {
    render(<Probe profile={{ ...PROFILE, building: null }} />);

    expect(screen.getByLabelText("building")).toHaveValue("");
  });

  it("空欄を弾く項目を必須と判定する", () => {
    render(<Probe />);

    expect(screen.getByTestId("lastName-required")).toHaveTextContent("必須");
    expect(screen.getByTestId("building-required")).toHaveTextContent("任意");
  });

  it("項目ごとに別の id を与える", () => {
    render(<Probe />);

    expect(screen.getByTestId("two-ids")).toHaveTextContent("別");
  });

  it("誤りの id を入力欄の id から導く", () => {
    render(<Probe />);

    expect(screen.getByTestId("lastName-error-id").textContent).toMatch(/-lastName-error$/);
  });

  it("触っていない項目には誤りを出さない", () => {
    render(<Probe />);

    expect(screen.getByTestId("lastName-message")).toBeEmptyDOMElement();
  });

  it("一度焦点が外れた項目を、以後は入力のたびに見直す", async () => {
    const user = userEvent.setup();

    render(<Probe />);
    await user.clear(screen.getByLabelText("lastName"));
    await user.tab();

    expect(await screen.findByText("姓を入力してください。")).toBeVisible();

    await user.type(screen.getByLabelText("lastName"), "山");

    expect(screen.getByTestId("lastName-message")).toBeEmptyDOMElement();
  });

  it("焦点が当たっている間は、焦点を当てた時点の文言より強い誤りを出さない", async () => {
    const user = userEvent.setup();

    render(<Probe />);
    await user.click(screen.getByLabelText("lastName"));
    await user.clear(screen.getByLabelText("lastName"));

    expect(screen.getByTestId("lastName-message")).toBeEmptyDOMElement();
  });

  it("server が返した項目の文言を出す", () => {
    render(
      <Probe
        state={failedActionState<void, ProfileField>({
          fieldErrors: { lastName: ["この姓は登録できません。"] },
        })}
      />,
    );

    expect(screen.getByTestId("lastName-message")).toHaveTextContent("この姓は登録できません。");
  });

  it("client 側の検証を server の応答より前に出す", async () => {
    const user = userEvent.setup();

    render(
      <Probe
        state={failedActionState<void, ProfileField>({
          fieldErrors: { lastName: ["この姓は登録できません。"] },
        })}
      />,
    );
    await user.clear(screen.getByLabelText("lastName"));
    await user.tab();

    expect(await screen.findByText("姓を入力してください。")).toBeVisible();
  });
});

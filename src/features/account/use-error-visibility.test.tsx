// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { useCallback, useState } from "react";
import { describe, expect, it } from "vitest";

import type { ErrorVisibility } from "./use-error-visibility";
import { useErrorVisibility } from "./use-error-visibility";

type Field = "lastName" | "firstName";

/**
 * 2 項目ぶんの入力欄を出し、実際に出る文言を描画する。
 *
 * @remarks
 * 検証の代わりに「空欄なら誤り」という規則をここが持ちます。hook は検証しないので、
 * 検証の結果を入力の変化に応じて与える側がテストに要ります。
 */
function Probe({ initial = "" }: { initial?: string }) {
  const [values, setValues] = useState<Record<Field, string>>({
    lastName: initial,
    firstName: "太郎",
  });
  const visibility = useErrorVisibility<Field>();

  return (
    <div>
      {(["lastName", "firstName"] as const).map((field) => (
        <Row
          field={field}
          key={field}
          setValues={setValues}
          value={values[field]}
          visibility={visibility}
        />
      ))}
    </div>
  );
}

/** 入力欄 1 つ。検証の代わりに「空欄なら誤り」という規則をここが当てる。 */
function Row({
  field,
  setValues,
  value,
  visibility,
}: {
  field: Field;
  setValues: Dispatch<SetStateAction<Record<Field, string>>>;
  value: string;
  visibility: ErrorVisibility<Field>;
}) {
  const current = value === "" ? `${field} を入力してください。` : undefined;
  const track = visibility.track(field, current);
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValues((previous) => ({ ...previous, [field]: event.target.value }));
    },
    [field, setValues],
  );

  return (
    <div>
      <label htmlFor={field}>{field}</label>
      <input
        id={field}
        onBlur={track.onBlur}
        onChange={onChange}
        onFocus={track.onFocus}
        value={value}
      />
      <p data-testid={`${field}-message`}>{visibility.visible(field, current) ?? ""}</p>
    </div>
  );
}

describe("useErrorVisibility", () => {
  it("焦点が当たっていない項目の誤りはそのまま出す", () => {
    render(<Probe initial="" />);

    expect(screen.getByTestId("lastName-message")).toHaveTextContent(
      "lastName を入力してください。",
    );
  });

  it("誤りが無い項目には何も出さない", () => {
    render(<Probe initial="山田" />);

    expect(screen.getByTestId("lastName-message")).toBeEmptyDOMElement();
  });

  it("焦点を当てた時点で誤りが無ければ、書き換えて崩れても新しい誤りを出さない", async () => {
    const user = userEvent.setup();

    render(<Probe initial="山田" />);
    await user.click(screen.getByLabelText("lastName"));
    await user.clear(screen.getByLabelText("lastName"));

    expect(screen.getByTestId("lastName-message")).toBeEmptyDOMElement();
  });

  it("焦点を当てた時点の誤りは、編集の途中でも出したままにする", async () => {
    const user = userEvent.setup();

    render(<Probe initial="" />);
    await user.click(screen.getByLabelText("lastName"));

    expect(screen.getByTestId("lastName-message")).toHaveTextContent(
      "lastName を入力してください。",
    );
  });

  it("編集の途中で直ればその場で消す", async () => {
    const user = userEvent.setup();

    render(<Probe initial="" />);
    await user.click(screen.getByLabelText("lastName"));
    await user.type(screen.getByLabelText("lastName"), "山");

    expect(screen.getByTestId("lastName-message")).toBeEmptyDOMElement();
  });

  it("焦点が外れたら、その時点の誤りを出す", async () => {
    const user = userEvent.setup();

    render(<Probe initial="山田" />);
    await user.click(screen.getByLabelText("lastName"));
    await user.clear(screen.getByLabelText("lastName"));
    await user.tab();

    expect(screen.getByTestId("lastName-message")).toHaveTextContent(
      "lastName を入力してください。",
    );
  });

  it("編集していない項目の誤りは、別の項目を編集していても伏せない", async () => {
    const user = userEvent.setup();

    render(<Probe initial="" />);
    await user.click(screen.getByLabelText("firstName"));
    await user.clear(screen.getByLabelText("firstName"));

    expect(screen.getByTestId("lastName-message")).toHaveTextContent(
      "lastName を入力してください。",
    );
  });

  it("編集中の項目で伏せた上限を、他の項目へ及ぼさない", async () => {
    const user = userEvent.setup();

    render(<Probe initial="" />);
    await user.click(screen.getByLabelText("firstName"));
    await user.clear(screen.getByLabelText("firstName"));

    expect(screen.getByTestId("firstName-message")).toBeEmptyDOMElement();
    expect(screen.getByTestId("lastName-message")).toHaveTextContent(
      "lastName を入力してください。",
    );
  });

  it("焦点が外れた後は、次に焦点を当てた時点の誤りを新しい上限にする", async () => {
    const user = userEvent.setup();

    render(<Probe initial="山田" />);
    await user.click(screen.getByLabelText("lastName"));
    await user.clear(screen.getByLabelText("lastName"));
    await user.tab();
    await user.click(screen.getByLabelText("lastName"));

    expect(screen.getByTestId("lastName-message")).toHaveTextContent(
      "lastName を入力してください。",
    );
  });
});

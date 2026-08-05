// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { useCallback, useId, useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ComboboxClient, type ComboboxClientOption } from "./combobox-client";

beforeAll(() => {
  // cmdk と Popover が使う寸法計測・表示位置の API を jsdom が持たないため、ここで補う。
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const OPTIONS: ComboboxClientOption[] = [
  { label: "東京都", value: "tokyo" },
  { label: "神奈川県", value: "kanagawa" },
  { label: "大阪府", disabled: true, value: "osaka" },
];

function Fixture({ defaultValue }: { defaultValue?: string }) {
  return (
    <ComboboxClient
      aria-label="都道府県"
      defaultValue={defaultValue}
      name="prefecture"
      options={OPTIONS}
    />
  );
}

function ControlledFixture() {
  const [value, setValue] = useState("tokyo");
  const handleChange = useCallback((next: string) => setValue(next), []);

  return (
    <>
      <ComboboxClient
        aria-label="都道府県"
        name="prefecture"
        onValueChange={handleChange}
        options={OPTIONS}
        value={value}
      />
      <output>{value}</output>
    </>
  );
}

function LabelledByFixture() {
  const labelId = useId();

  return (
    <>
      <span id={labelId}>都道府県</span>
      <ComboboxClient aria-labelledby={labelId} name="prefecture" options={OPTIONS} />
    </>
  );
}

describe("ComboboxClient", () => {
  it("開くまで候補一覧を表示しない", () => {
    render(<Fixture />);

    expect(screen.getByRole("button", { name: "都道府県" })).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("未選択のときは placeholder を表示し、hidden input は空になる", () => {
    const { container } = render(<Fixture />);

    expect(screen.getByRole("button", { name: "都道府県" })).toHaveTextContent("選択してください");
    expect(container.querySelector("input[name='prefecture']")).toHaveValue("");
  });

  it("選択済みの値に対応する label を trigger へ表示する", () => {
    render(<Fixture defaultValue="kanagawa" />);

    expect(screen.getByRole("button", { name: "都道府県" })).toHaveTextContent("神奈川県");
  });

  it("trigger は combobox ではなく popover を開く button として公開する", () => {
    render(<Fixture />);

    const trigger = screen.getByRole("button", { name: "都道府県" });

    expect(trigger).not.toHaveAttribute("role", "combobox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("開くと絞り込み入力と候補一覧を表示する", () => {
    render(<Fixture />);

    fireEvent.click(screen.getByRole("button", { name: "都道府県" }));

    expect(screen.getByRole("combobox", { name: "都道府県" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("入力すると label で候補を絞り込む", () => {
    render(<Fixture />);
    fireEvent.click(screen.getByRole("button", { name: "都道府県" }));

    fireEvent.change(screen.getByRole("combobox", { name: "都道府県" }), {
      target: { value: "神奈川" },
    });

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option")).toHaveTextContent("神奈川県");
  });

  it("一致する候補が無いときは空の文言を表示する", () => {
    render(<Fixture />);
    fireEvent.click(screen.getByRole("button", { name: "都道府県" }));

    fireEvent.change(screen.getByRole("combobox", { name: "都道府県" }), {
      target: { value: "該当なし" },
    });

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("該当する候補がありません")).toBeInTheDocument();
  });

  it("候補を選ぶと hidden input へ値を入れて閉じる", () => {
    const { container } = render(<Fixture />);
    fireEvent.click(screen.getByRole("button", { name: "都道府県" }));

    fireEvent.click(screen.getByRole("option", { name: "神奈川県" }));

    expect(container.querySelector("input[name='prefecture']")).toHaveValue("kanagawa");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("選択を呼び出し元へ通知し、制御 component として反映できる", () => {
    render(<ControlledFixture />);
    fireEvent.click(screen.getByRole("button", { name: "都道府県" }));

    fireEvent.click(screen.getByRole("option", { name: "神奈川県" }));

    expect(screen.getByRole("status")).toHaveTextContent("kanagawa");
  });

  it("disabled の候補は選択できない", () => {
    const onValueChange = vi.fn();
    render(
      <ComboboxClient
        aria-label="都道府県"
        name="prefecture"
        onValueChange={onValueChange}
        options={OPTIONS}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "都道府県" }));

    fireEvent.click(screen.getByRole("option", { name: "大阪府" }));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("trigger を無効にできる", () => {
    render(<ComboboxClient aria-label="都道府県" disabled name="prefecture" options={OPTIONS} />);

    expect(screen.getByRole("button", { name: "都道府県" })).toBeDisabled();
  });

  it("aria-labelledby でも trigger と popover の名前になる", () => {
    render(<LabelledByFixture />);

    fireEvent.click(screen.getByRole("button", { name: "都道府県" }));

    expect(screen.getByRole("dialog", { name: "都道府県" })).toBeInTheDocument();
  });

  it("開いた状態で a11y 自動検査に違反しない", async () => {
    const { baseElement } = render(<Fixture />);
    fireEvent.click(screen.getByRole("button", { name: "都道府県" }));

    const result = await axe(baseElement, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });
});

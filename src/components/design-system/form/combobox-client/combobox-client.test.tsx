// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useId, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ComboboxClient, type ComboboxClientOption } from "./combobox-client";

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

function DescribedByFixture() {
  const errorId = useId();

  return (
    <>
      <ComboboxClient
        aria-describedby={errorId}
        aria-invalid={true}
        aria-label="都道府県"
        name="prefecture"
        options={OPTIONS}
      />
      <p id={errorId}>都道府県を選んでください。</p>
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

  it("選択中の値が候補から外れると、trigger は placeholder に戻り、hidden input には値が残る", () => {
    const { container, rerender } = render(<Fixture defaultValue="kanagawa" />);

    rerender(
      <ComboboxClient
        aria-label="都道府県"
        defaultValue="kanagawa"
        name="prefecture"
        options={OPTIONS.filter((option) => option.value !== "kanagawa")}
      />,
    );

    expect(screen.getByRole("button", { name: "都道府県" })).toHaveTextContent("選択してください");
    expect(container.querySelector("input[name='prefecture']")).toHaveValue("kanagawa");
  });

  it("trigger は combobox ではなく popover を開く button として公開する", () => {
    render(<Fixture />);

    const trigger = screen.getByRole("button", { name: "都道府県" });

    expect(trigger).not.toHaveAttribute("role", "combobox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("開くと絞り込み入力と候補一覧を表示する", async () => {
    render(<Fixture />);

    await userEvent.click(screen.getByRole("button", { name: "都道府県" }));

    expect(screen.getByRole("combobox", { name: "都道府県" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("入力すると label で候補を絞り込む", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "都道府県" }));

    await userEvent.type(screen.getByRole("combobox", { name: "都道府県" }), "神奈川");

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option")).toHaveTextContent("神奈川県");
  });

  it("一致する候補が無いときは空の文言を表示する", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "都道府県" }));

    await userEvent.type(screen.getByRole("combobox", { name: "都道府県" }), "該当なし");

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("該当する候補がありません")).toBeInTheDocument();
  });

  it("emptyMessage を渡せば、一致する候補が無いときにその文言を表示する", async () => {
    render(
      <ComboboxClient
        aria-label="都道府県"
        emptyMessage="一致する都道府県がありません"
        name="prefecture"
        options={OPTIONS}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "都道府県" }));

    await userEvent.type(screen.getByRole("combobox", { name: "都道府県" }), "該当なし");

    expect(screen.getByText("一致する都道府県がありません")).toBeInTheDocument();
    expect(screen.queryByText("該当する候補がありません")).not.toBeInTheDocument();
  });

  it("入力語を受け取る呼び出し元には入力語を伝え、候補を手元で絞らない", async () => {
    const onSearchChange = vi.fn();

    render(
      <ComboboxClient
        aria-label="都道府県"
        name="prefecture"
        onSearchChange={onSearchChange}
        options={OPTIONS}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "都道府県" }));

    await userEvent.type(screen.getByRole("combobox", { name: "都道府県" }), "神奈川");

    expect(onSearchChange).toHaveBeenLastCalledWith("神奈川");
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("候補を選ぶと hidden input へ値を入れて閉じる", async () => {
    const { container } = render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "都道府県" }));

    await userEvent.click(screen.getByRole("option", { name: "神奈川県" }));

    expect(container.querySelector("input[name='prefecture']")).toHaveValue("kanagawa");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("選択中の候補にだけ選択済みの印を出す", async () => {
    render(<Fixture defaultValue="kanagawa" />);

    await userEvent.click(screen.getByRole("button", { name: "都道府県" }));

    expect(screen.getByRole("option", { name: "神奈川県" }).querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("option", { name: "東京都" }).querySelector("svg")).toBeNull();
    expect(screen.getByRole("option", { name: "大阪府" }).querySelector("svg")).toBeNull();
  });

  it("選択を呼び出し元へ通知し、制御 component として反映できる", async () => {
    render(<ControlledFixture />);
    await userEvent.click(screen.getByRole("button", { name: "都道府県" }));

    await userEvent.click(screen.getByRole("option", { name: "神奈川県" }));

    expect(screen.getByRole("status")).toHaveTextContent("kanagawa");
  });

  it("選んだ候補そのものも、値と一緒に呼び出し元へ渡す", async () => {
    const onValueChange = vi.fn();
    render(
      <ComboboxClient
        aria-label="都道府県"
        name="prefecture"
        onValueChange={onValueChange}
        options={OPTIONS}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "都道府県" }));

    await userEvent.click(screen.getByRole("option", { name: "神奈川県" }));

    expect(onValueChange).toHaveBeenCalledWith(
      "kanagawa",
      OPTIONS.find((option) => option.value === "kanagawa"),
    );
  });

  it("誤りの説明と誤りの印を trigger へ結び付ける", () => {
    render(<DescribedByFixture />);

    const trigger = screen.getByRole("button", { name: "都道府県" });

    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAccessibleDescription("都道府県を選んでください。");
  });

  it("誤りを渡さなければ、trigger は誤りの印を持たない", () => {
    render(<ComboboxClient aria-label="都道府県" name="prefecture" options={OPTIONS} />);

    expect(screen.getByRole("button", { name: "都道府県" })).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("disabled の候補は選択できない", async () => {
    const onValueChange = vi.fn();
    render(
      <ComboboxClient
        aria-label="都道府県"
        name="prefecture"
        onValueChange={onValueChange}
        options={OPTIONS}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "都道府県" }));

    await userEvent.click(screen.getByRole("option", { name: "大阪府" }));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("trigger を無効にできる", () => {
    render(<ComboboxClient aria-label="都道府県" disabled name="prefecture" options={OPTIONS} />);

    expect(screen.getByRole("button", { name: "都道府県" })).toBeDisabled();
  });

  it("aria-labelledby でも trigger と popover の名前になる", async () => {
    render(<LabelledByFixture />);

    await userEvent.click(screen.getByRole("button", { name: "都道府県" }));

    expect(screen.getByRole("dialog", { name: "都道府県" })).toBeInTheDocument();
  });

  it("aria-label が無ければ、絞り込み入力の名前は searchPlaceholder になる", async () => {
    render(<LabelledByFixture />);

    await userEvent.click(screen.getByRole("button", { name: "都道府県" }));

    expect(screen.getByRole("combobox", { name: "検索" })).toBeInTheDocument();
  });

  it("開いた状態で a11y 自動検査に違反しない", async () => {
    const { baseElement } = render(<Fixture />);
    await userEvent.click(screen.getByRole("button", { name: "都道府県" }));

    const result = await axe(baseElement, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });
});

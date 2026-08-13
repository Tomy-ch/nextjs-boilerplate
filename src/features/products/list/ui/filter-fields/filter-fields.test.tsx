// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { FILTER_KEY } from "../../../facade/list-url/list-url";
import { type FilterGroup, ProductFilterFields } from "./filter-fields";

const GROUPS: readonly FilterGroup[] = [
  {
    key: FILTER_KEY.CATEGORY,
    legend: "カテゴリ",
    options: [
      { value: "", label: "すべて" },
      { value: "c1", label: "オーディオ" },
      { value: "c2", label: "ウェアラブル" },
    ],
  },
  {
    key: FILTER_KEY.STATUS,
    legend: "状態",
    options: [
      { value: "", label: "すべて" },
      { value: "s1", label: "公開" },
      { value: "s2", label: "在庫切れ" },
    ],
  },
];

function StatefulFields({
  label,
  initial = {},
}: {
  label: string;
  initial?: Readonly<Record<string, string>>;
}) {
  const [selection, setSelection] = useState(initial);
  const select = useCallback((key: string, value: string) => {
    setSelection((current) => ({ ...current, [key]: value }));
  }, []);

  return (
    <section aria-label={label}>
      <ProductFilterFields groups={GROUPS} onSelect={select} selection={selection} />
    </section>
  );
}

function group(legend: string) {
  return within(screen.getByRole("group", { name: legend }));
}

function groupIn(label: string, legend: string) {
  return within(
    within(screen.getByRole("region", { name: label })).getByRole("group", { name: legend }),
  );
}

function namesIn(label: string): readonly string[] {
  return within(screen.getByRole("region", { name: label }))
    .getAllByRole("radio")
    .map((radio) => radio.getAttribute("name") ?? "");
}

describe("ProductFilterFields", () => {
  it("群ごとに見出しを付けて選択肢を並べる", () => {
    render(<ProductFilterFields groups={GROUPS} onSelect={vi.fn()} selection={{}} />);

    expect(group("カテゴリ").getAllByRole("radio")).toHaveLength(3);
    expect(group("状態").getByLabelText("在庫切れ")).toBeVisible();
  });

  it("効いている値に印を付ける", () => {
    render(
      <ProductFilterFields
        groups={GROUPS}
        onSelect={vi.fn()}
        selection={{ [FILTER_KEY.CATEGORY]: "c1" }}
      />,
    );

    expect(group("カテゴリ").getByLabelText("オーディオ")).toBeChecked();
    expect(group("カテゴリ").getByLabelText("すべて")).not.toBeChecked();
  });

  it("値の指定が無い群は「すべて」を選んだ状態にする", () => {
    render(<ProductFilterFields groups={GROUPS} onSelect={vi.fn()} selection={{}} />);

    expect(group("状態").getByLabelText("すべて")).toBeChecked();
    expect(group("状態").getByLabelText("公開")).not.toBeChecked();
  });

  it("選ぶと群のキーと値を伝える", async () => {
    const onSelect = vi.fn<(key: string, value: string) => void>();
    render(<ProductFilterFields groups={GROUPS} onSelect={onSelect} selection={{}} />);

    await userEvent.click(group("カテゴリ").getByLabelText("ウェアラブル"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(FILTER_KEY.CATEGORY, "c2");
  });

  it("「すべて」を選ぶと空の値を伝える", async () => {
    const onSelect = vi.fn<(key: string, value: string) => void>();
    render(
      <ProductFilterFields
        groups={GROUPS}
        onSelect={onSelect}
        selection={{ [FILTER_KEY.CATEGORY]: "c1" }}
      />,
    );

    await userEvent.click(group("カテゴリ").getByLabelText("すべて"));

    expect(onSelect).toHaveBeenCalledWith(FILTER_KEY.CATEGORY, "");
  });

  it("同じ群では 1 つの値しか選べない", async () => {
    render(<StatefulFields label="脇" />);

    await userEvent.click(group("カテゴリ").getByLabelText("オーディオ"));
    await userEvent.click(group("カテゴリ").getByLabelText("ウェアラブル"));

    expect(group("カテゴリ").getByLabelText("ウェアラブル")).toBeChecked();
    expect(group("カテゴリ").getByLabelText("オーディオ")).not.toBeChecked();
  });

  it("別の群の選択は互いに外れない", async () => {
    render(<StatefulFields label="脇" />);

    await userEvent.click(group("カテゴリ").getByLabelText("オーディオ"));
    await userEvent.click(group("状態").getByLabelText("公開"));

    expect(group("カテゴリ").getByLabelText("オーディオ")).toBeChecked();
    expect(group("状態").getByLabelText("公開")).toBeChecked();
  });

  it("同じ入力欄が 2 組同時にあっても radio の群が混ざらない", async () => {
    render(
      <>
        <StatefulFields label="脇" />
        <StatefulFields initial={{ [FILTER_KEY.CATEGORY]: "c2" }} label="overlay" />
      </>,
    );

    await userEvent.click(groupIn("脇", "カテゴリ").getByLabelText("オーディオ"));

    expect(groupIn("overlay", "カテゴリ").getByLabelText("ウェアラブル")).toBeChecked();
    expect(namesIn("脇").some((name) => namesIn("overlay").includes(name))).toBe(false);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <ProductFilterFields
        groups={GROUPS}
        onSelect={vi.fn()}
        selection={{ [FILTER_KEY.CATEGORY]: "c1" }}
      />,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});

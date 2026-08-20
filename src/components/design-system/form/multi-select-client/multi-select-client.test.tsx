// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useId, useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  MultiSelectClient,
  type MultiSelectClientOption,
  toSummary,
  toToggledValues,
} from "./multi-select-client";

beforeAll(() => {
  // Popover が使う表示位置・寸法計測の API を jsdom が持たないため、ここで補う。
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const countSummary = (labels: readonly string[]): string => `${labels.length} 件`;

const OPTIONS: MultiSelectClientOption[] = [
  { label: "下書き", value: "1" },
  { label: "公開", value: "2" },
  { label: "凍結", disabled: true, value: "3" },
];

function Fixture({ defaultValue }: { defaultValue?: readonly string[] }) {
  return (
    <MultiSelectClient
      aria-label="タグ"
      defaultValue={defaultValue}
      name="tags"
      options={OPTIONS}
    />
  );
}

function ControlledFixture() {
  const [values, setValues] = useState<readonly string[]>(["1"]);
  const handleChange = useCallback((next: readonly string[]) => setValues(next), []);

  return (
    <>
      <MultiSelectClient
        aria-label="タグ"
        name="tags"
        onValueChange={handleChange}
        options={OPTIONS}
        value={values}
      />
      <output>{values.join(",")}</output>
    </>
  );
}

function LabelledFixture() {
  const labelId = useId();

  return (
    <>
      <span id={labelId}>タグ</span>
      <MultiSelectClient
        aria-labelledby={labelId}
        defaultValue={["1"]}
        name="tags"
        options={OPTIONS}
      />
    </>
  );
}

/** 候補は開かないと現れない。名前には要約が続くため、項目名の部分一致で探す。 */
async function open(name: string | RegExp = /タグ/): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name }));
}

/** 送信される値。hidden input は role を持たないため DOM から直接読む。 */
function submittedValues(container: HTMLElement): string[] {
  return [...container.querySelectorAll('input[type="hidden"][name="tags"]')].flatMap((input) =>
    input instanceof HTMLInputElement ? [input.value] : [],
  );
}

describe("MultiSelectClient", () => {
  it("名前の出所が渡されなければ、引き金は読み上げ名の参照を持たない", () => {
    render(<MultiSelectClient name="tags" options={OPTIONS} />);

    expect(screen.getByRole("button")).not.toHaveAttribute("aria-labelledby");
  });

  it("選んでいなければ未選択の文言を出す", () => {
    render(<Fixture />);

    expect(screen.getByRole("button", { name: /すべて/ })).toBeInTheDocument();
  });

  it("1 つだけ選ばれていれば、その文言をそのまま出す", () => {
    render(<Fixture defaultValue={["2"]} />);

    expect(screen.getByRole("button", { name: /公開/ })).toBeInTheDocument();
  });

  it("複数選ばれていれば、先頭と残りの件数で畳む", () => {
    render(<Fixture defaultValue={["1", "2"]} />);

    expect(screen.getByRole("button", { name: /下書き 他 1 件/ })).toBeInTheDocument();
  });

  it("要約の組み方を差し替えられる", () => {
    render(
      <MultiSelectClient
        aria-label="タグ"
        defaultValue={["1", "2"]}
        formatSummary={countSummary}
        name="tags"
        options={OPTIONS}
      />,
    );

    expect(screen.getByRole("button", { name: /2 件/ })).toBeInTheDocument();
  });

  it("開くと候補が checkbox として並ぶ", async () => {
    render(<Fixture defaultValue={["1"]} />);
    await open();

    expect(screen.getByRole("checkbox", { name: "下書き" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "公開" })).not.toBeChecked();
  });

  it("選ぶと送信される値が増える", async () => {
    const { container } = render(<Fixture defaultValue={["1"]} />);
    await open();
    await userEvent.click(screen.getByRole("checkbox", { name: "公開" }));

    expect(submittedValues(container)).toEqual(["1", "2"]);
  });

  it("外すと送信される値が減る", async () => {
    const { container } = render(<Fixture defaultValue={["1", "2"]} />);
    await open();
    await userEvent.click(screen.getByRole("checkbox", { name: "下書き" }));

    expect(submittedValues(container)).toEqual(["2"]);
  });

  it("押した順ではなく候補の並び順で送る", async () => {
    const { container } = render(<Fixture />);
    await open();
    await userEvent.click(screen.getByRole("checkbox", { name: "公開" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "下書き" }));

    expect(submittedValues(container)).toEqual(["1", "2"]);
  });

  it("呼び出し元が値を持つ場合、その値だけが反映される", async () => {
    render(<ControlledFixture />);
    await open();
    await userEvent.click(screen.getByRole("checkbox", { name: "公開" }));

    expect(screen.getByText("1,2")).toBeInTheDocument();
  });

  it("外の要素を名前にすると、読み上げは項目名と要約になる", () => {
    render(<LabelledFixture />);

    expect(screen.getByRole("button", { name: "タグ 下書き" })).toBeInTheDocument();
  });

  it("aria-label を渡した場合も、要約が読み上げから消えない", () => {
    render(<Fixture defaultValue={["1"]} />);

    expect(screen.getByRole("button", { name: "タグ 下書き" })).toBeInTheDocument();
  });
  it("選べない候補は押せない", async () => {
    render(<Fixture />);
    await open();

    expect(screen.getByRole("checkbox", { name: "凍結" })).toBeDisabled();
  });

  it("候補が無くても落ちない", async () => {
    render(<MultiSelectClient aria-label="タグ" name="tags" options={[]} />);
    await open();

    expect(screen.queryAllByRole("checkbox")).toEqual([]);
  });

  it("無効なら開かない", async () => {
    render(<MultiSelectClient aria-label="タグ" disabled name="tags" options={OPTIONS} />);
    await userEvent.click(screen.getByRole("button", { name: /タグ/ }));

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Fixture defaultValue={["1"]} />);

    expect((await axe(container)).violations).toEqual([]);
  });

  it("開いた候補の面が a11y 自動検査に違反しない", async () => {
    render(<Fixture defaultValue={["1"]} />);
    await open();

    expect((await axe(screen.getByRole("dialog"))).violations).toEqual([]);
  });
});

describe("toToggledValues", () => {
  // ----- 正常系 -----
  it("入れた値を足す", () => {
    expect(toToggledValues(OPTIONS, ["1"], "2", true)).toEqual(["1", "2"]);
  });

  it("切った値を外す", () => {
    expect(toToggledValues(OPTIONS, ["1", "2"], "1", false)).toEqual(["2"]);
  });

  it("押した順ではなく候補の並び順で返す", () => {
    expect(toToggledValues(OPTIONS, ["2"], "1", true)).toEqual(["1", "2"]);
  });

  // ----- 異常系 -----
  it("候補に無い値は落とす", () => {
    expect(toToggledValues(OPTIONS, ["9"], "1", true)).toEqual(["1"]);
  });

  it("候補が空なら何も返さない", () => {
    expect(toToggledValues([], ["1"], "1", true)).toEqual([]);
  });
});

describe("toSummary", () => {
  const format = (labels: readonly string[]) => `${labels.length} 件`;

  // ----- 正常系 -----
  it("選ばれていなければ未選択の文言を返す", () => {
    expect(toSummary([], "すべて", format)).toBe("すべて");
  });

  it("1 つだけならその文言をそのまま返す", () => {
    expect(toSummary(["公開"], "すべて", format)).toBe("公開");
  });

  it("2 つ以上なら畳み方に委ねる", () => {
    expect(toSummary(["下書き", "公開"], "すべて", format)).toBe("2 件");
  });
});

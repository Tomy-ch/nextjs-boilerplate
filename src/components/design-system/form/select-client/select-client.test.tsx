// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  SelectClient,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select-client";

beforeEach(() => {
  // jsdom は scrollIntoView を実装しない。Radix Select は開くときに候補へこれを呼ぶ。
  Element.prototype.scrollIntoView = vi.fn();
});

function SelectFixture({
  disabled = false,
  position = "popper",
}: {
  disabled?: boolean;
  position?: "item-aligned" | "popper";
}) {
  return (
    <SelectClient defaultValue="standard" disabled={disabled} name="display-mode">
      <SelectTrigger aria-label="表示形式">
        <SelectValue placeholder="選択してください" />
      </SelectTrigger>
      <SelectContent position={position}>
        <SelectGroup>
          <SelectLabel>表示形式</SelectLabel>
          <SelectItem value="compact">簡潔</SelectItem>
          <SelectSeparator />
          <SelectItem value="standard">標準</SelectItem>
        </SelectGroup>
      </SelectContent>
    </SelectClient>
  );
}

describe("SelectClient", () => {
  it("初期値を持つ client 選択 UI を表示する", () => {
    render(<SelectFixture />);

    expect(screen.getByRole("combobox", { name: "表示形式" })).toHaveTextContent("標準");
  });

  it("disabled 状態では trigger を操作不能にする", () => {
    render(<SelectFixture disabled />);

    expect(screen.getByRole("combobox", { name: "表示形式" })).toBeDisabled();
  });

  it("item-aligned の配置も明示的に選べる", () => {
    render(<SelectFixture position="item-aligned" />);

    expect(screen.getByRole("combobox", { name: "表示形式" })).toBeVisible();
  });

  it("開くと候補を一覧として示す", () => {
    render(<SelectFixture />);

    fireEvent.keyDown(screen.getByRole("combobox", { name: "表示形式" }), { key: "ArrowDown" });

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "簡潔" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "表示形式" })).toBeInTheDocument();
  });

  it("候補を選ぶと値が変わり一覧を閉じる", () => {
    render(<SelectFixture />);

    fireEvent.keyDown(screen.getByRole("combobox", { name: "表示形式" }), { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: "簡潔" }));

    expect(screen.getByRole("combobox", { name: "表示形式" })).toHaveTextContent("簡潔");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("aria-label を持つ選択 UI は a11y 自動検査に違反しない", async () => {
    // Portal で body 直下へ描くため baseElement を渡す。container では trigger しか入らない。
    const { baseElement } = render(<SelectFixture />);

    fireEvent.keyDown(screen.getByRole("combobox", { name: "表示形式" }), { key: "ArrowDown" });

    const result = await axe(baseElement, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });
});

describe("SelectTrigger", () => {
  // ----- 正常系 -----
  it("開閉を切り替える combobox として slot を持つ要素を描画する", () => {
    render(<SelectFixture />);

    expect(screen.getByRole("combobox", { name: "表示形式" })).toHaveAttribute(
      "data-slot",
      "select-trigger",
    );
  });

  // ----- 異常系 -----
  it("disabled のときは操作できない", () => {
    render(<SelectFixture disabled />);

    expect(screen.getByRole("combobox", { name: "表示形式" })).toBeDisabled();
  });
});

describe("SelectValue", () => {
  // ----- 正常系 -----
  it("選択済みの値を trigger の中へ表示する", () => {
    render(<SelectFixture />);

    expect(screen.getByRole("combobox", { name: "表示形式" })).toHaveTextContent("標準");
  });
});

describe("SelectContent", () => {
  // ----- 正常系 -----
  it("開くと listbox として slot を持つ要素を描画する", () => {
    render(<SelectFixture />);

    fireEvent.click(screen.getByRole("combobox", { name: "表示形式" }));

    expect(screen.getByRole("listbox")).toHaveAttribute("data-slot", "select-content");
  });

  // ----- 異常系 -----
  it("閉じている間は候補を描画しない", () => {
    render(<SelectFixture />);

    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

describe("SelectGroup", () => {
  // ----- 正常系 -----
  it("候補の束として slot を持つ要素を描画する", () => {
    render(<SelectFixture />);

    fireEvent.click(screen.getByRole("combobox", { name: "表示形式" }));

    expect(document.querySelector('[data-slot="select-group"]')).not.toBeNull();
  });
});

describe("SelectLabel", () => {
  // ----- 正常系 -----
  it("束の見出しとして slot を持つ要素を描画する", () => {
    render(<SelectFixture />);

    fireEvent.click(screen.getByRole("combobox", { name: "表示形式" }));

    expect(document.querySelector('[data-slot="select-label"]')).toHaveTextContent("表示形式");
  });
});

describe("SelectItem", () => {
  // ----- 正常系 -----
  it("候補 1 件を option として描画する", () => {
    render(<SelectFixture />);

    fireEvent.click(screen.getByRole("combobox", { name: "表示形式" }));

    expect(screen.getByRole("option", { name: "簡潔" })).toHaveAttribute(
      "data-slot",
      "select-item",
    );
  });

  it("選択済みの候補を選択状態として示す", () => {
    render(<SelectFixture />);

    fireEvent.click(screen.getByRole("combobox", { name: "表示形式" }));

    expect(screen.getByRole("option", { name: "標準" })).toHaveAttribute("data-state", "checked");
  });
});

describe("SelectSeparator", () => {
  // ----- 正常系 -----
  it("区切りとして slot を持つ要素を描画する", () => {
    render(<SelectFixture />);

    fireEvent.click(screen.getByRole("combobox", { name: "表示形式" }));

    expect(document.querySelector('[data-slot="select-separator"]')).not.toBeNull();
  });
});

describe("SelectScrollUpButton", () => {
  // ----- 異常系 -----
  it("候補があふれていなければスクロール操作を描画しない", () => {
    render(<SelectFixture />);

    fireEvent.click(screen.getByRole("combobox", { name: "表示形式" }));

    expect(document.querySelector('[data-slot="select-scroll-up-button"]')).toBeNull();
  });
});

describe("SelectScrollDownButton", () => {
  // ----- 異常系 -----
  it("候補があふれていなければスクロール操作を描画しない", () => {
    render(<SelectFixture />);

    fireEvent.click(screen.getByRole("combobox", { name: "表示形式" }));

    expect(document.querySelector('[data-slot="select-scroll-down-button"]')).toBeNull();
  });
});

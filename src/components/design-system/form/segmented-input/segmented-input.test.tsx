// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useId } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  SegmentedInput,
  SegmentedInputGroup,
  SegmentedInputSeparator,
  SegmentedInputSlot,
} from "./segmented-input";
import { SEGMENTED_INPUT_PATTERN } from "./segmented-input.definition";

const LENGTH = 6;

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const originalResizeObserver = globalThis.ResizeObserver;

function CodeFixture({
  mask,
  maskChar,
  onChange,
  pattern,
  value,
  withSeparator = true,
}: {
  mask?: boolean;
  maskChar?: string;
  onChange?: (value: string) => void;
  pattern?: string;
  value?: string;
  withSeparator?: boolean;
}) {
  const fieldId = useId();

  return (
    <>
      <label htmlFor={fieldId}>確認コード</label>
      <SegmentedInput
        autoComplete="one-time-code"
        mask={mask}
        maskChar={maskChar}
        id={fieldId}
        maxLength={LENGTH}
        name="code"
        onChange={onChange}
        pattern={pattern}
        value={value}
      >
        <SegmentedInputGroup>
          <SegmentedInputSlot index={0} />
          <SegmentedInputSlot index={1} />
          <SegmentedInputSlot index={2} />
        </SegmentedInputGroup>
        {withSeparator ? <SegmentedInputSeparator /> : null}
        <SegmentedInputGroup>
          <SegmentedInputSlot index={3} />
          <SegmentedInputSlot index={4} />
          <SegmentedInputSlot index={5} />
        </SegmentedInputGroup>
      </SegmentedInput>
    </>
  );
}

function controlOf() {
  return screen.getByLabelText("確認コード");
}

beforeEach(() => {
  globalThis.ResizeObserver = ResizeObserverStub;
  // jsdom は座標から要素を引く API を持たない。この入力の実体（input-otp）は focus のあと
  // 表示位置を測りに来るため、実際の focus を通す操作で必ずここへ到達する。
  document.elementFromPoint ??= () => null;
});

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver;
});

describe("SegmentedInput", () => {
  it("名前のある単一の入力として公開し、補完の手掛かりを持つ", () => {
    render(<CodeFixture />);

    const control = controlOf();

    expect(control).toHaveAttribute("autocomplete", "one-time-code");
    expect(control).toHaveAttribute("maxlength", String(LENGTH));
    expect(control).toHaveAttribute("name", "code");
  });

  it("pattern で受け付ける文字種を絞れる", async () => {
    const onChange = vi.fn();

    render(<CodeFixture onChange={onChange} pattern={SEGMENTED_INPUT_PATTERN.DIGITS} />);

    // 貼り付けで送る。打鍵だと 1 文字ずつ届き、受け付けない文字が混ざった値そのものを
    // 渡す形にならない。
    await userEvent.click(controlOf());
    await userEvent.paste("12a");

    expect(onChange).not.toHaveBeenCalled();

    await userEvent.paste("123");

    expect(onChange).toHaveBeenCalledWith("123");
  });

  it("桁数ぶんの枠を描く", () => {
    const { container } = render(<CodeFixture />);

    expect(container.querySelectorAll('[data-slot="segmented-input-slot"]')).toHaveLength(LENGTH);
  });

  it("入力した値を桁ごとに映す", () => {
    const { container } = render(<CodeFixture value="123456" />);

    const slots = [...container.querySelectorAll('[data-slot="segmented-input-slot"]')];

    expect(slots.map((slot) => slot.textContent)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("入力を onChange で呼び出し元へ渡す", async () => {
    const onChange = vi.fn();

    render(<CodeFixture onChange={onChange} />);

    await userEvent.type(controlOf(), "123");

    expect(onChange).toHaveBeenCalledWith("123");
  });

  it("入力位置の桁を data-active で示す", async () => {
    const { container } = render(<CodeFixture value="12" />);

    const slots = [...container.querySelectorAll('[data-slot="segmented-input-slot"]')];

    await userEvent.click(controlOf());

    expect(slots[2]).toHaveAttribute("data-active", "true");
    expect(slots[0]).toHaveAttribute("data-active", "false");
  });

  it("SegmentedInput の外に置かれた枠は何も映さない", () => {
    const { container } = render(<SegmentedInputSlot index={0} />);

    const slot = container.querySelector('[data-slot="segmented-input-slot"]');

    expect(slot).toBeEmptyDOMElement();
    expect(slot).not.toHaveAttribute("data-active");
  });

  it("mask を指定すると桁の文字を伏せる", () => {
    const { container } = render(<CodeFixture mask value="123456" />);

    const slots = [...container.querySelectorAll('[data-slot="segmented-input-slot"]')];

    expect(slots.map((slot) => slot.textContent)).toEqual(["•", "•", "•", "•", "•", "•"]);
    expect(slots[0]).toHaveAttribute("data-masked", "true");
  });

  it("伏せ字の文字を差し替えられる", () => {
    const { container } = render(<CodeFixture mask maskChar="*" value="12" />);

    const slots = [...container.querySelectorAll('[data-slot="segmented-input-slot"]')];

    expect(slots.map((slot) => slot.textContent)).toEqual(["*", "*", "", "", "", ""]);
  });

  it("桁ごとに伏せるかを上書きできる", () => {
    const { container } = render(
      <SegmentedInput mask maxLength={2} value="12">
        <SegmentedInputGroup>
          <SegmentedInputSlot index={0} />
          <SegmentedInputSlot index={1} mask={false} />
        </SegmentedInputGroup>
      </SegmentedInput>,
    );

    const slots = [...container.querySelectorAll('[data-slot="segmented-input-slot"]')];

    expect(slots.map((slot) => slot.textContent)).toEqual(["•", "2"]);
  });

  it("区切りは装飾として支援技術から隠す", () => {
    const { container } = render(<CodeFixture />);

    const separator = container.querySelector('[data-slot="segmented-input-separator"]');

    expect(separator).toHaveAttribute("aria-hidden", "true");
    expect(separator).not.toHaveAttribute("role");
  });

  it("区切りは置かなくてもよい", () => {
    const { container } = render(<CodeFixture withSeparator={false} />);

    expect(container.querySelector('[data-slot="segmented-input-separator"]')).toBeNull();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CodeFixture value="123456" />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("SegmentedInputGroup", () => {
  it("桁の束として slot を持つ要素を描画する", () => {
    const { container } = render(<CodeFixture />);

    expect(container.querySelectorAll('[data-slot="segmented-input-group"]')).toHaveLength(2);
  });
});

describe("SegmentedInputSlot", () => {
  it("桁 1 つとして slot を持つ要素を、桁数分だけ描画する", () => {
    const { container } = render(<CodeFixture />);

    expect(container.querySelectorAll('[data-slot="segmented-input-slot"]')).toHaveLength(LENGTH);
  });
});

describe("SegmentedInputSeparator", () => {
  it("束の区切りとして slot を持つ要素を描画する", () => {
    const { container } = render(<CodeFixture />);

    expect(container.querySelector('[data-slot="segmented-input-separator"]')).not.toBeNull();
  });

  it("区切りを置かない構成では描画しない", () => {
    const { container } = render(<CodeFixture withSeparator={false} />);

    expect(container.querySelector('[data-slot="segmented-input-separator"]')).toBeNull();
  });
});

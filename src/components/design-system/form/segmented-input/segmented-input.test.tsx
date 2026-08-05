// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
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

describe("SegmentedInput", () => {
  beforeEach(() => {
    globalThis.ResizeObserver = ResizeObserverStub;
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });

  it("名前のある単一の入力として公開し、補完の手掛かりを持つ", () => {
    render(<CodeFixture />);

    const control = controlOf();

    expect(control).toHaveAttribute("autocomplete", "one-time-code");
    expect(control).toHaveAttribute("maxlength", String(LENGTH));
    expect(control).toHaveAttribute("name", "code");
  });

  it("pattern で受け付ける文字種を絞れる", () => {
    const onChange = vi.fn();

    render(<CodeFixture onChange={onChange} pattern={SEGMENTED_INPUT_PATTERN.DIGITS} />);

    fireEvent.change(controlOf(), { target: { value: "12a" } });

    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(controlOf(), { target: { value: "123" } });

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

  it("入力を onChange で呼び出し元へ渡す", () => {
    const onChange = vi.fn();

    render(<CodeFixture onChange={onChange} />);

    fireEvent.change(controlOf(), { target: { value: "123" } });

    expect(onChange).toHaveBeenCalledWith("123");
  });

  it("入力位置の桁を data-active で示す", () => {
    const { container } = render(<CodeFixture value="12" />);

    const slots = [...container.querySelectorAll('[data-slot="segmented-input-slot"]')];

    fireEvent.focus(controlOf());

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

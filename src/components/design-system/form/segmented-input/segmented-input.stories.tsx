import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId, useState } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "../field/field";
import {
  SegmentedInput,
  SegmentedInputGroup,
  SegmentedInputSeparator,
  SegmentedInputSlot,
} from "./segmented-input";
import { SEGMENTED_INPUT_PATTERN } from "./segmented-input.definition";

const LENGTH = 6;

function Slots({ from, to }: { from: number; to: number }) {
  return (
    <SegmentedInputGroup>
      {Array.from({ length: to - from }, (_, offset) => from + offset).map((index) => (
        <SegmentedInputSlot index={index} key={index} />
      ))}
    </SegmentedInputGroup>
  );
}

function SplitSlots() {
  return (
    <>
      <Slots from={0} to={3} />
      <SegmentedInputSeparator />
      <Slots from={3} to={LENGTH} />
    </>
  );
}

function ValidatedSegmentedInput() {
  const fieldId = useId();
  const [value, setValue] = useState("");
  const isInvalid = value.length === LENGTH && value !== "123456";

  return (
    <Field className="w-96">
      <FieldLabel htmlFor={fieldId}>確認コード</FieldLabel>
      <FieldDescription>お送りした 6 桁のコードを入力してください。</FieldDescription>
      <SegmentedInput
        aria-invalid={isInvalid}
        autoComplete="one-time-code"
        id={fieldId}
        inputMode="numeric"
        maxLength={LENGTH}
        name="code"
        onChange={setValue}
        pattern={SEGMENTED_INPUT_PATTERN.DIGITS}
        value={value}
      >
        <SplitSlots />
      </SegmentedInput>
      {isInvalid ? <FieldError>コードが一致しません。</FieldError> : null}
    </Field>
  );
}

const meta = {
  title: "Form/SegmentedInput",
  component: SegmentedInput,
  parameters: { layout: "centered" },
  args: {
    autoComplete: "one-time-code",
    children: <SplitSlots />,
    inputMode: "numeric",
    maxLength: LENGTH,
    name: "code",
    pattern: SEGMENTED_INPUT_PATTERN.DIGITS,
  },
} satisfies Meta<typeof SegmentedInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 配信された確認コード。`pattern` は数字、`autoComplete` は配信されるコードなので `one-time-code`、
 * `inputMode` は `numeric`、伏せない。
 */
export const Default: Story = {};

/**
 * 暗証番号。配信されないため `autoComplete` は `off` にし、肩越しに覗かれないよう `mask` を立てる。
 * 4 軸のうち二つだけが確認コードと違う。
 */
export const Pin: Story = {
  args: {
    autoComplete: "off",
    children: <Slots from={0} to={4} />,
    mask: true,
    maxLength: 4,
    name: "pin",
    value: "1234",
  },
};

/**
 * ライセンスキー。英数字を受け付け、配信されないため `autoComplete` は `off`、keyboard は `text`。
 * 桁が多いので区切りを挟む。
 */
export const LicenseKey: Story = {
  args: {
    autoComplete: "off",
    children: (
      <>
        <Slots from={0} to={4} />
        <SegmentedInputSeparator />
        <Slots from={4} to={8} />
      </>
    ),
    inputMode: "text",
    maxLength: 8,
    name: "license",
    pattern: SEGMENTED_INPUT_PATTERN.DIGITS_AND_CHARS,
    value: "A1B2C3D4",
  },
};

/**
 * 伏せ字と文字種は独立している。英数字の復旧キーを伏せる、という組み合わせも成り立つ。
 */
export const MaskedLicenseKey: Story = {
  args: {
    autoComplete: "off",
    children: <Slots from={0} to={8} />,
    inputMode: "text",
    mask: true,
    maxLength: 8,
    name: "recovery",
    pattern: SEGMENTED_INPUT_PATTERN.DIGITS_AND_CHARS,
    value: "A1B2C3D4",
  },
};

/** 伏せ字に使う文字を差し替える場合。 */
export const MaskedWithCustomChar: Story = {
  args: {
    autoComplete: "off",
    children: <Slots from={0} to={4} />,
    mask: true,
    maskChar: "*",
    maxLength: 4,
    name: "pin",
    value: "1234",
  },
};

/**
 * 桁ごとに伏せるかを変える場合。末尾だけ見せる、といった確認用の表示に使う。
 * `SegmentedInput` の指定を `SegmentedInputSlot` の `mask` が上書きする。
 */
export const PartiallyMasked: Story = {
  args: {
    autoComplete: "off",
    children: (
      <SegmentedInputGroup>
        <SegmentedInputSlot index={0} />
        <SegmentedInputSlot index={1} />
        <SegmentedInputSlot index={2} mask={false} />
        <SegmentedInputSlot index={3} mask={false} />
      </SegmentedInputGroup>
    ),
    mask: true,
    maxLength: 4,
    name: "pin",
    value: "1234",
  },
};

/** 区切りを置かない場合。桁数が少ないときはまとめて並べる。 */
export const SingleGroup: Story = {
  args: { children: <Slots from={0} to={4} />, maxLength: 4 },
};

/** 入力済みの状態。値は呼び出し元が持つ。 */
export const Filled: Story = { args: { value: "123456" } };

/** 検証エラー。文言は `FieldError` が表示し、この component は持たない。 */
export const Invalid: Story = { render: () => <ValidatedSegmentedInput /> };

/** 操作できない状態。 */
export const Disabled: Story = { args: { disabled: true } };

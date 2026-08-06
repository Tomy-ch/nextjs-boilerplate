import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Input } from "../input/input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "./field";

const meta = {
  title: "Form/Field",
  component: Field,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "label・入力・説明・エラーを一つの form field として構成します。**配線は自動ではありません。**",
          "`FieldLabel` の `htmlFor` と control の `id`、`FieldError` の `id` と control の",
          "`aria-describedby`、`Field` の `data-invalid` と control の `aria-invalid` は、",
          "いずれも呼び出し元が対応させます。この component が持つのは並びと間隔と、",
          "`data-invalid` に応じた見た目だけです。id は `useId()` で作り、固定値を書きません。",
          "検証そのもの・エラー文言・送信は持ちません。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;

function DefaultField() {
  const displayNameId = useId();

  return (
    <FieldGroup className="w-80">
      <Field>
        <FieldLabel htmlFor={displayNameId}>表示名</FieldLabel>
        <FieldContent>
          <Input id={displayNameId} name="displayName" />
          <FieldDescription>他の利用者に表示される名前です。</FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

function InvalidField() {
  const contactId = useId();
  const contactErrorId = useId();

  return (
    <FieldGroup className="w-80">
      <Field data-invalid="true">
        <FieldLabel htmlFor={contactId}>連絡先</FieldLabel>
        <FieldContent>
          <Input
            aria-describedby={contactErrorId}
            aria-invalid="true"
            id={contactId}
            name="contact"
          />
          <FieldError id={contactErrorId}>入力内容を確認してください。</FieldError>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

function SeparatedFields() {
  const firstId = useId();
  const secondId = useId();
  return (
    <FieldGroup className="w-80">
      <Field>
        <FieldLabel htmlFor={firstId}>項目</FieldLabel>
        <Input id={firstId} name="sample" />
      </Field>
      <FieldSeparator>または</FieldSeparator>
      <Field>
        <FieldLabel htmlFor={secondId}>別の項目</FieldLabel>
        <Input id={secondId} name="alternate" />
      </Field>
    </FieldGroup>
  );
}

/** 基本の構成。説明文は入力の下に置き、`FieldContent` が入力と説明をまとめる。 */
export const Default: Story = { render: () => <DefaultField /> };

/**
 * 検証に通らなかった状態。見た目は `Field` の `data-invalid`、読み上げは control の
 * `aria-invalid` と `aria-describedby` が担うので、**両方を渡す**。
 */
export const Invalid: Story = { render: () => <InvalidField /> };

/** 択一の入力手段を並べる場合。区切りに語を置いて、どちらか一方であることを示す。 */
export const WithSeparator: Story = { render: () => <SeparatedFields /> };

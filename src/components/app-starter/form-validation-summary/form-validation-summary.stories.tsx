import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { Field, FieldError, FieldLabel } from "@/components/design-system/form/field/field";
import { Input } from "@/components/design-system/form/input/input";
import { FormValidationSummary } from "./form-validation-summary";

const meta = {
  title: "Feedback/FormValidationSummary",
  component: FormValidationSummary,
  parameters: { layout: "centered" },
} satisfies Meta<typeof FormValidationSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 検証エラーの一覧。各項目が該当の入力欄への link になる。 */
export const Default: Story = {
  args: {
    errors: [
      { fieldId: "email", message: "メールアドレスの形式が正しくありません" },
      { fieldId: "postal-code", message: "郵便番号は 7 桁の数字で入力してください" },
    ],
  },
  render: (args) => (
    <div className="w-96">
      <FormValidationSummary {...args} />
    </div>
  ),
};

/** エラーが 1 件の場合。 */
export const SingleError: Story = {
  args: { errors: [{ fieldId: "email", message: "メールアドレスを入力してください" }] },
  render: (args) => (
    <div className="w-96">
      <FormValidationSummary {...args} />
    </div>
  ),
};

/** 見出しは呼び出し元が差し替えられる。 */
export const CustomTitle: Story = {
  args: {
    errors: [{ fieldId: "email", message: "メールアドレスを入力してください" }],
    title: "3 件の入力を修正してください",
  },
  render: (args) => (
    <div className="w-96">
      <FormValidationSummary {...args} />
    </div>
  ),
};

/** エラーが無い場合は何も描画しない。 */
export const NoErrors: Story = {
  args: { errors: [] },
  render: (args) => (
    <div className="w-96 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
      <FormValidationSummary {...args} />
      エラーが無いため要約は描画されない
    </div>
  ),
};

function ValidatedForm() {
  const emailId = useId();
  const postalCodeId = useId();
  const summaryId = useId();

  return (
    <form action="/users" className="flex w-96 flex-col gap-4">
      <FormValidationSummary
        errors={[
          { fieldId: emailId, message: "メールアドレスの形式が正しくありません" },
          { fieldId: postalCodeId, message: "郵便番号は 7 桁の数字で入力してください" },
        ]}
        id={summaryId}
      />
      <Field>
        <FieldLabel htmlFor={emailId}>メールアドレス</FieldLabel>
        <Input aria-invalid defaultValue="user@" id={emailId} name="email" type="email" />
        <FieldError>メールアドレスの形式が正しくありません</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor={postalCodeId}>郵便番号</FieldLabel>
        <Input aria-invalid defaultValue="123" id={postalCodeId} name="postalCode" />
        <FieldError>郵便番号は 7 桁の数字で入力してください</FieldError>
      </Field>
      <Button type="submit">登録する</Button>
    </form>
  );
}

/** form 全体での配線。要約と `FieldError` は両方出し、要約から各欄へ飛べる。 */
export const InForm: Story = {
  args: { errors: [] },
  render: () => <ValidatedForm />,
};

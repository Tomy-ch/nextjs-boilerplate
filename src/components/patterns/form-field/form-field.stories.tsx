import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Input } from "../../design-system/form/input/input";
import {
  SelectNative,
  SelectNativeOption,
} from "../../design-system/form/select-native/select-native";
import { FormField } from "./form-field";

const CONTROL_ID = "form-field-example";

const meta = {
  title: "Form/FormField",
  component: FormField,
  args: {
    controlId: CONTROL_ID,
    label: "メールアドレス",
    required: true,
    children: (control) => <Input {...control} defaultValue="taro.yamada@example.com" />,
  },
  parameters: {
    docs: {
      description: {
        component: [
          "項目名・必須の印・入力欄・補足・誤りを 1 つの組にまとめる外枠です。入力欄は children で",
          "受け取るため、種類が変わっても並びが揃います。**入力欄の ARIA 属性は children へ渡されるので、",
          "受け取ってそのまま広げます。**",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。必須の項目。 */
export const Default: Story = {};

/** 任意の項目。印の有無ではなく、印そのもので読み分けさせる。 */
export const Optional: Story = {
  args: {
    label: "建物名・部屋番号",
    required: false,
    children: (control) => <Input {...control} defaultValue="" />,
  },
};

/** 誤りがある場合。label・枠・文言が同時に切り替わる。 */
export const WithError: Story = {
  args: {
    message: "メールアドレスの形式が正しくありません。",
    children: (control) => <Input {...control} defaultValue="not-an-email" />,
  },
};

/** 補足がある場合。誤りとは別に常時出す。 */
export const WithDescription: Story = {
  args: { description: "登録の確認に使います。ログインには使いません。" },
};

/** 入力欄が select の場合。外枠は同じまま中身だけが変わる。 */
export const WithSelect: Story = {
  args: {
    label: "都道府県",
    children: (control) => (
      <SelectNative {...control} defaultValue="東京都">
        <SelectNativeOption value="東京都">東京都</SelectNativeOption>
        <SelectNativeOption value="神奈川県">神奈川県</SelectNativeOption>
      </SelectNative>
    ),
  },
};

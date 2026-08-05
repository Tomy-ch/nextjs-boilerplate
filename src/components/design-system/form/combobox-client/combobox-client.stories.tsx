import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useId, useState } from "react";
import { userEvent, within } from "storybook/test";

import { Label } from "../label/label";
import { ComboboxClient, type ComboboxClientOption } from "./combobox-client";

/** 候補は開かないと現れない。開閉状態を props で渡せないため、trigger を押して開く。 */
async function openCombobox({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "都道府県" }));
}

/** 絞り込み入力は Portal の中に出るため、canvas ではなく document から探す。 */
function findSearchInput(): Promise<HTMLElement> {
  return within(document.body).findByPlaceholderText("検索");
}

const PREFECTURES: ComboboxClientOption[] = [
  { label: "北海道", value: "hokkaido" },
  { label: "東京都", value: "tokyo" },
  { label: "神奈川県", value: "kanagawa" },
  { label: "愛知県", value: "aichi" },
  { label: "大阪府", value: "osaka" },
  { label: "福岡県", value: "fukuoka" },
];

function LabelledCombobox() {
  const labelId = useId();

  return (
    <div className="flex w-72 flex-col gap-2">
      <Label id={labelId}>都道府県</Label>
      <ComboboxClient aria-labelledby={labelId} name="prefecture" options={PREFECTURES} />
    </div>
  );
}

function ControlledCombobox() {
  const [value, setValue] = useState("tokyo");
  const handleChange = useCallback((next: string) => setValue(next), []);

  return (
    <div className="flex w-72 flex-col gap-2">
      <ComboboxClient
        aria-label="都道府県"
        name="prefecture"
        onValueChange={handleChange}
        options={PREFECTURES}
        value={value}
      />
      <p className="text-muted-foreground text-sm">送信される値: {value || "（未選択）"}</p>
    </div>
  );
}

const meta = {
  title: "Form/ComboboxClient",
  component: ComboboxClient,
  parameters: { layout: "centered" },
  args: { "aria-label": "都道府県", name: "prefecture", options: PREFECTURES },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ComboboxClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 未選択の状態。trigger には placeholder を表示する。 */
export const Default: Story = {};

/** 選択済みの状態。trigger には値ではなく対応する label を表示する。 */
export const Selected: Story = { args: { defaultValue: "kanagawa" } };

/** 選べない候補を含む場合。 */
export const WithDisabledOption: Story = {
  args: {
    defaultValue: "tokyo",
    options: [...PREFECTURES, { label: "沖縄県（準備中）", disabled: true, value: "okinawa" }],
  },
};

/** 文言を差し替える場合。空表示の文言も呼び出し元が決める。 */
export const CustomMessages: Story = {
  args: {
    emptyMessage: "一致する都道府県がありません",
    placeholder: "都道府県を選ぶ",
    searchPlaceholder: "都道府県名で検索",
  },
};

/** 操作できない状態。 */
export const Disabled: Story = { args: { defaultValue: "tokyo", disabled: true } };

/**
 * 候補を開いた状態。選択済みの候補には印が付く。絞り込み入力・候補一覧・空表示は、いずれも
 * 開いてからでないと現れない。
 */
export const Open: Story = {
  args: { defaultValue: "kanagawa" },
  play: openCombobox,
};

/**
 * 入力語で絞り込んだ状態。一致は label に対して行い、`value`（`tokyo` などの送信値）では
 * 引っ掛からない。
 */
export const Filtered: Story = {
  play: async (context) => {
    await openCombobox(context);
    await userEvent.type(await findSearchInput(), "県");
  },
};

/** 一致する候補が無い状態。文言は `emptyMessage` が決める。 */
export const NoMatch: Story = {
  args: { emptyMessage: "一致する都道府県がありません" },
  play: async (context) => {
    await openCombobox(context);
    await userEvent.type(await findSearchInput(), "存在しない県");
  },
};

/** 外の `Label` を `aria-labelledby` で名前にする場合。 */
export const WithLabel: Story = { render: () => <LabelledCombobox /> };

/** 制御 component として値を保持し、送信される値を併記する場合。 */
export const Controlled: Story = { render: () => <ControlledCombobox /> };

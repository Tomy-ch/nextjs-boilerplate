import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Calendar } from "./calendar";

const initialDate = new Date(2026, 7, 12);

function SingleDateCalendar() {
  const [selected, setSelected] = useState<Date | undefined>(initialDate);

  return <Calendar mode="single" month={initialDate} onSelect={setSelected} selected={selected} />;
}

const meta = {
  title: "Form/Calendar",
  component: Calendar,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "月の一覧を常に開いた面として置き、日付または日付範囲を選ばせます。**面を持たない部品です。**",
          "入力欄から popup として開きたい場合は `DatePickerClient` を使い、この component は",
          "その中身になります。予約や期間指定のように、カレンダーを見ながら決めることが",
          "主導線である画面では、閉じずにそのまま置きます。",
          "`mode` が選び方を決め、`single` は 1 日、`range` は開始日と終了日の対を返します。",
          "選択値の保持と form への送信は呼び出し元が持ちます。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof Calendar>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 1 日だけ選ぶ場合。選択値は呼び出し元が保持する。 */
export const SingleDate: Story = {
  render: () => <SingleDateCalendar />,
};

/** 開始日と終了日の対を選ぶ場合。間の日は範囲として塗られる。 */
export const DateRange: Story = {
  render: () => (
    <Calendar
      defaultMonth={initialDate}
      mode="range"
      selected={{ from: new Date(2026, 7, 9), to: new Date(2026, 7, 14) }}
    />
  ),
};

/**
 * 選べない日を持つ場合。選択の可否はこの component が判定せず、`disabled` として
 * 呼び出し元が渡す。
 */
export const DisabledDates: Story = {
  render: () => (
    <Calendar
      defaultMonth={initialDate}
      disabled={{ before: new Date(2026, 7, 8), after: new Date(2026, 7, 20) }}
      mode="single"
    />
  ),
};

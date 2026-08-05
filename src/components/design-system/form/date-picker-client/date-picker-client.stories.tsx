import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, userEvent, within } from "storybook/test";

import { DatePickerClient } from "./date-picker-client";

/** カレンダーは開かないと現れない。開閉状態を props で渡せないため、trigger を押して開く。 */
async function openCalendar({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> {
  await userEvent.click(within(canvasElement).getByRole("button"));
}

const meta = {
  title: "Form/DatePickerClient",
  component: DatePickerClient,
  args: { name: "date", onValueChange: fn() },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "`Calendar` を popup に載せ、選んだ日付を native form の値として送信する client island です。",
          "日付そのものを組み立てる責務は `Calendar` にあり、この component は開閉と、",
          "`YYYY-MM-DD` 文字列との相互変換だけを持ちます。単一日付を直接打てる場面では ",
          '`Input type="date"` を優先し、月をまたいで探す操作が要る場合にこちらを使います。',
          "範囲選択・時刻・タイムゾーン変換は扱いません。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof DatePickerClient>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 未選択の状態。trigger には日付を選ぶ操作であることだけを示す。 */
export const Default: Story = {};

/** 選択済みの状態。trigger には送信される値と同じ日付を表示する。 */
export const WithInitialValue: Story = { args: { defaultValue: "2026-08-03" } };

/** 操作できない状態。開くこともできない。 */
export const Disabled: Story = { args: { defaultValue: "2026-08-03", disabled: true } };

/**
 * カレンダーを開いた状態。選択済みの日付が属する月から開き、日付を押すと popup が閉じて
 * trigger の表示と送信値が入れ替わる。
 */
export const Open: Story = {
  args: { defaultValue: "2026-08-03" },
  play: openCalendar,
};

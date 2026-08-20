import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useId, useState } from "react";
import { userEvent, within } from "storybook/test";

import { Label } from "../label/label";
import { MultiSelectClient, type MultiSelectClientOption } from "./multi-select-client";

/** 候補は開かないと現れない。開閉状態を props で渡せないため、trigger を押して開く。 */
function openMultiSelect(name: string | RegExp) {
  return async ({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> => {
    await userEvent.click(within(canvasElement).getByRole("button", { name }));
  };
}

const TAGS: MultiSelectClientOption[] = [
  { label: "下書き", value: "1" },
  { label: "レビュー中", value: "2" },
  { label: "公開", value: "3" },
  { label: "アーカイブ", value: "4" },
  { label: "凍結", value: "5", disabled: true },
];

function LabelledMultiSelect({ defaultValue }: { defaultValue?: readonly string[] }) {
  const labelId = useId();

  return (
    <div className="flex w-72 flex-col gap-2">
      <Label id={labelId}>タグ</Label>
      <MultiSelectClient
        aria-labelledby={labelId}
        defaultValue={defaultValue}
        name="tags"
        options={TAGS}
      />
    </div>
  );
}

function ControlledMultiSelect() {
  const [values, setValues] = useState<readonly string[]>(["1", "3"]);
  const handleChange = useCallback((next: readonly string[]) => setValues(next), []);

  return (
    <div className="flex w-72 flex-col gap-2">
      <MultiSelectClient
        aria-label="タグ"
        name="tags"
        onValueChange={handleChange}
        options={TAGS}
        value={values}
      />
      <p className="text-sm text-muted-foreground">選択: {values.join(", ") || "なし"}</p>
    </div>
  );
}

const meta = {
  title: "Form/MultiSelectClient",
  component: MultiSelectClient,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "候補を畳んだまま複数選ぶ client island です。**確定の操作を持たず**、checkbox を押した時点で",
          "`onValueChange` が飛びます。確定を待たせるかどうかは呼び出し元が決めます。",
          "値は hidden input として同じ名前を繰り返す形で運ぶため、`a=1&a=2` の並びを受け取る契約へ",
          "そのまま載ります。絞り込みは持たないので、候補が画面に収まらないほど多い用途には向きません。",
        ].join(""),
      },
    },
  },
  args: { name: "tags", options: TAGS, "aria-label": "タグ" },
} satisfies Meta<typeof MultiSelectClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 1 つも選んでいない状態。trigger には未選択を表す文言が出る。 */
export const Default: Story = {};

/** 開いた状態。候補は checkbox として並び、選べない候補は押せない。 */
export const Open: Story = { play: openMultiSelect("タグ") };

/** 1 つだけ選んだ状態。要約ではなくその文言がそのまま出る。 */
export const SingleSelected: Story = { args: { defaultValue: ["3"] } };

/** 複数選んだ状態。先頭の文言と残りの件数で畳む。 */
export const MultipleSelected: Story = { args: { defaultValue: ["1", "3", "4"] } };

/** 複数選んで開いた状態。畳まれていた選択が checkbox に現れる。 */
export const MultipleSelectedOpen: Story = {
  args: { defaultValue: ["1", "3", "4"] },
  play: openMultiSelect(/タグ/),
};

/** 要約の組み方を差し替えた場合。単位や語順を変えたいときに渡す。 */
export const CustomSummary: Story = {
  args: {
    defaultValue: ["1", "3", "4"],
    formatSummary: (labels) => `${labels.length} 件のタグ`,
  },
};

/** 外の要素を名前にする場合。読み上げは「タグ <要約>」になる。 */
export const WithLabel: Story = { render: () => <LabelledMultiSelect defaultValue={["1", "3"]} /> };

/** 呼び出し元が値を持つ場合。選択の反映先を外に置ける。 */
export const Controlled: Story = { render: () => <ControlledMultiSelect /> };

/** 操作を受け付けない状態。 */
export const Disabled: Story = { args: { disabled: true, defaultValue: ["3"] } };

/** 候補が無い場合。開いても空の面が出るだけで、落ちない。 */
export const NoOptions: Story = { args: { options: [] }, play: openMultiSelect("タグ") };

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentProps } from "react";
import { fn } from "storybook/test";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

type AccordionStoryProps = {
  firstItemOpen: boolean;
  onFirstItemToggle: NonNullable<ComponentProps<"details">["onToggle"]>;
  onSecondItemToggle: NonNullable<ComponentProps<"details">["onToggle"]>;
  secondItemOpen: boolean;
};

function AccordionPreview({
  firstItemOpen,
  onFirstItemToggle,
  onSecondItemToggle,
  secondItemOpen,
}: AccordionStoryProps) {
  return (
    <Accordion className="w-96">
      <AccordionItem onToggle={onFirstItemToggle} open={firstItemOpen}>
        <AccordionTrigger>利用方法</AccordionTrigger>
        <AccordionContent>必要な情報を確認してから、次の操作へ進めます。</AccordionContent>
      </AccordionItem>
      <AccordionItem onToggle={onSecondItemToggle} open={secondItemOpen}>
        <AccordionTrigger>補足情報</AccordionTrigger>
        <AccordionContent>内容は必要なときだけ開いて確認できます。</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

const meta = {
  title: "Container/Accordion",
  component: AccordionPreview,
  argTypes: {
    firstItemOpen: { control: "boolean", name: "先頭項目を初期状態で開く" },
    onFirstItemToggle: { control: false, name: "先頭項目の toggle" },
    onSecondItemToggle: { control: false, name: "二つ目の項目の toggle" },
    secondItemOpen: { control: "boolean", name: "二つ目の項目を初期状態で開く" },
  },
  args: {
    firstItemOpen: false,
    onFirstItemToggle: fn<NonNullable<ComponentProps<"details">["onToggle"]>>(),
    onSecondItemToggle: fn<NonNullable<ComponentProps<"details">["onToggle"]>>(),
    secondItemOpen: false,
  },
  parameters: {
    controls: { include: ["firstItemOpen", "secondItemOpen"] },
    layout: "centered",
    docs: {
      description: {
        component: [
          "関連する**複数**の詳細を並べ、必要な項目だけ開いて確認させます。",
          "開く対象が一つしかないなら `Collapsible` を使います。この区別は見た目ではなく構造で、",
          "`Accordion` は項目の集合そのものを表します。",
          "実装は native の `details` / `summary` なので、hydration の前から開閉でき、",
          "ページ内検索も閉じた項目に届きます。開閉状態を外の state と同期させる必要は持ちません。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof AccordionPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** すべて閉じた状態。どの項目も独立して開閉でき、同時に開いても構わない。 */
export const Default: Story = {
  render: (args) => <AccordionPreview {...args} />,
};

/** 複数を開いた状態。開いた項目が他を閉じることはない。 */
export const MultipleOpen: Story = {
  args: { firstItemOpen: true, secondItemOpen: true },
  render: (args) => <AccordionPreview {...args} />,
};

import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { JsonLd } from "./json-ld";

const meta = {
  title: "Display/JsonLd",
  component: JsonLd,
  parameters: {
    docs: {
      description: {
        component: [
          "画面が持つ構造化データを `<script type=\"application/ld+json\">` として埋め込みます。",
          "**見える要素を持ちません。** 何を伝えるか（schema.org の type と項目）は画面の判断で、",
          "この component は直列化と `<` の逃がしだけを持ちます。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof JsonLd>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。組織を名乗る最小の構造化データ。画面には何も出ない。 */
export const Default: Story = {
  args: {
    data: { "@context": "https://schema.org", "@type": "Organization", name: "Acme" },
  },
};

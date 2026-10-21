import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";

import { FIXTURE_NOW, HELD_COUPONS } from "../coupons.fixture";
import { WalletView } from "./view";

const meta = {
  title: "Page/Coupons/Wallet",
  component: WalletView,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 900 },
      description: {
        component: [
          "保有クーポンの一覧と、キャンペーンコードでの受け取りです。**受け取りは成功したことにして",
          "返します。** 一覧の取り直しはカタログでは起きません。取得の失敗は route の境界が出すため、",
          "ここには置きません。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <ContentContainer className="py-8">
        <PageHeader>
          <div>
            <PageHeaderTitle>クーポン</PageHeaderTitle>
            <PageHeaderDescription>受け取ったクーポンと、その状態を確認できます。</PageHeaderDescription>
          </div>
        </PageHeader>
        <Story />
      </ContentContainer>
    ),
  ],
  args: { coupons: HELD_COUPONS, now: FIXTURE_NOW },
} satisfies Meta<typeof WalletView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 4 状態が 1 枚ずつ並ぶ。 */
export const Default: Story = {};

/** 1 枚も持っていない。受け取り欄は残る。 */
export const Empty: Story = {
  args: { coupons: [] },
};

/** タブレット幅。 */
export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ幅。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

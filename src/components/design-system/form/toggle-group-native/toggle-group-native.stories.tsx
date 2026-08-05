import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ToggleGroupNative, ToggleGroupNativeItem } from "./toggle-group-native";

const meta = {
  title: "Form/ToggleGroupNative",
  component: ToggleGroupNative,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ToggleGroupNative>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 排他選択。項目は radio なので、選択は form の値として送信される。 */
export const Single: Story = {
  render: () => (
    <ToggleGroupNative aria-label="表示通貨">
      <ToggleGroupNativeItem defaultChecked name="currency" value="jpy">
        JPY
      </ToggleGroupNativeItem>
      <ToggleGroupNativeItem name="currency" value="usd">
        USD
      </ToggleGroupNativeItem>
      <ToggleGroupNativeItem name="currency" value="eur">
        EUR
      </ToggleGroupNativeItem>
    </ToggleGroupNative>
  ),
};

/** 複数選択。項目を `type="checkbox"` にすると同時に選べる。 */
export const Multiple: Story = {
  render: () => (
    <ToggleGroupNative aria-label="表示する列">
      <ToggleGroupNativeItem defaultChecked name="columns" type="checkbox" value="price">
        価格
      </ToggleGroupNativeItem>
      <ToggleGroupNativeItem name="columns" type="checkbox" value="stock">
        アーカイブ
      </ToggleGroupNativeItem>
    </ToggleGroupNative>
  ),
};

/** 枠線のある `outline` variant。 */
export const Outline: Story = {
  render: () => (
    <ToggleGroupNative aria-label="表示通貨">
      <ToggleGroupNativeItem defaultChecked name="currency" value="jpy" variant="outline">
        JPY
      </ToggleGroupNativeItem>
      <ToggleGroupNativeItem name="currency" value="usd" variant="outline">
        USD
      </ToggleGroupNativeItem>
    </ToggleGroupNative>
  ),
};

/** 大きさの 3 段階。枠線のある variant で境界を見せる。 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {(["sm", "default", "lg"] as const).map((size) => (
        <ToggleGroupNative aria-label={`表示通貨（${size}）`} key={size}>
          <ToggleGroupNativeItem
            defaultChecked
            name={`currency-${size}`}
            size={size}
            value="jpy"
            variant="outline"
          >
            JPY
          </ToggleGroupNativeItem>
          <ToggleGroupNativeItem
            name={`currency-${size}`}
            size={size}
            value="usd"
            variant="outline"
          >
            USD
          </ToggleGroupNativeItem>
        </ToggleGroupNative>
      ))}
    </div>
  ),
};

/** 選べない項目を含む場合。 */
export const WithDisabledItem: Story = {
  render: () => (
    <ToggleGroupNative aria-label="表示通貨">
      <ToggleGroupNativeItem defaultChecked name="currency" value="jpy" variant="outline">
        JPY
      </ToggleGroupNativeItem>
      <ToggleGroupNativeItem name="currency" value="usd" variant="outline">
        USD
      </ToggleGroupNativeItem>
      <ToggleGroupNativeItem disabled name="currency" value="eur" variant="outline">
        EUR
      </ToggleGroupNativeItem>
    </ToggleGroupNative>
  ),
};

/** native form に載せる場合。送信に browser JavaScript を必要としない。 */
export const InForm: Story = {
  render: () => (
    <form action="/items" className="flex flex-col items-start gap-3">
      <ToggleGroupNative aria-label="表示通貨">
        <ToggleGroupNativeItem defaultChecked name="currency" value="jpy" variant="outline">
          JPY
        </ToggleGroupNativeItem>
        <ToggleGroupNativeItem name="currency" value="usd" variant="outline">
          USD
        </ToggleGroupNativeItem>
      </ToggleGroupNative>
      <button className="text-sm underline" type="submit">
        適用する
      </button>
    </form>
  ),
};

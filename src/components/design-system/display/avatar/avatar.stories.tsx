import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SAMPLE_AVATAR_URL } from "~catalog/lib/sample-asset";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "./avatar";
import { AVATAR_SIZE } from "./avatar.definition";

const meta = {
  title: "Display/Avatar",
  component: Avatar,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 画像の読み込みに成功した場合。隣に氏名があるので画像は装飾に留める。 */
export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Avatar>
        <AvatarImage alt="" src={SAMPLE_AVATAR_URL} />
        <AvatarFallback>山</AvatarFallback>
      </Avatar>
      <span className="text-sm">山田 太郎</span>
    </div>
  ),
};

/** 画像を持たない、または読み込みに失敗した場合。 */
export const Fallback: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Avatar>
        <AvatarImage alt="" src="/存在しない画像.png" />
        <AvatarFallback>山</AvatarFallback>
      </Avatar>
      <span className="text-sm">山田 太郎</span>
    </div>
  ),
};

/** 表示サイズの一覧。 */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar size={AVATAR_SIZE.SMALL}>
        <AvatarImage alt="" src={SAMPLE_AVATAR_URL} />
        <AvatarFallback>小</AvatarFallback>
      </Avatar>
      <Avatar size={AVATAR_SIZE.DEFAULT}>
        <AvatarImage alt="" src={SAMPLE_AVATAR_URL} />
        <AvatarFallback>中</AvatarFallback>
      </Avatar>
      <Avatar size={AVATAR_SIZE.LARGE}>
        <AvatarImage alt="" src={SAMPLE_AVATAR_URL} />
        <AvatarFallback>大</AvatarFallback>
      </Avatar>
    </div>
  ),
};

/** 標識を重ねる場合。色だけでは伝わらないため読み上げ用の文言を添える。 */
export const WithBadge: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Avatar>
        <AvatarImage alt="" src={SAMPLE_AVATAR_URL} />
        <AvatarFallback>山</AvatarFallback>
        <AvatarBadge>
          <span className="sr-only">オンライン</span>
        </AvatarBadge>
      </Avatar>
      <span className="text-sm">山田 太郎</span>
    </div>
  ),
};

/** 複数人を重ねて並べ、表示しきれない人数を末尾に示す場合。 */
export const Group: Story = {
  render: () => (
    <AvatarGroup>
      <Avatar>
        <AvatarImage alt="" src={SAMPLE_AVATAR_URL} />
        <AvatarFallback>山</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>佐</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>鈴</AvatarFallback>
      </Avatar>
      <AvatarGroupCount>+5</AvatarGroupCount>
    </AvatarGroup>
  ),
};

/** avatar 自体が人物を示す場合は、画像に誰かが分かる `alt` を渡す。 */
export const StandaloneWithAlt: Story = {
  render: () => (
    <Avatar size={AVATAR_SIZE.LARGE}>
      <AvatarImage alt="山田 太郎" src={SAMPLE_AVATAR_URL} />
      <AvatarFallback>山</AvatarFallback>
    </Avatar>
  ),
};

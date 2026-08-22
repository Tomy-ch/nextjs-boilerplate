import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import { SAMPLE_AVATAR_URL } from "~catalog/lib/sample-asset";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar/avatar";
import { Message, MessageAvatar, MessageContent, MessageHeader } from "../message/message";
import { MESSAGE_ALIGN } from "../message/message.definition";
import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from "./bubble";
import {
  BUBBLE_ALIGN,
  BUBBLE_REACTIONS_SIDE,
  BUBBLE_VARIANT,
  type BubbleVariant,
} from "./bubble.definition";

const VARIANT_LABELS: ReadonlyArray<{ variant: BubbleVariant; label: string }> = [
  { variant: BUBBLE_VARIANT.DEFAULT, label: "default" },
  { variant: BUBBLE_VARIANT.SECONDARY, label: "secondary" },
  { variant: BUBBLE_VARIANT.MUTED, label: "muted" },
  { variant: BUBBLE_VARIANT.TINTED, label: "tinted" },
  { variant: BUBBLE_VARIANT.OUTLINE, label: "outline" },
  { variant: BUBBLE_VARIANT.GHOST, label: "ghost" },
  { variant: BUBBLE_VARIANT.DESTRUCTIVE, label: "destructive" },
];

function DefaultBubble() {
  return (
    <Bubble>
      <BubbleContent>受け取りました。内容を確認して折り返します。</BubbleContent>
    </Bubble>
  );
}

function AllVariants() {
  return (
    <div className="flex flex-col gap-3">
      {VARIANT_LABELS.map(({ variant, label }) => (
        <Bubble key={variant} variant={variant}>
          <BubbleContent>{label}</BubbleContent>
        </Bubble>
      ))}
    </div>
  );
}

function BothAlignments() {
  return (
    <div className="flex flex-col gap-2">
      <Bubble align={BUBBLE_ALIGN.START} variant={BUBBLE_VARIANT.OUTLINE}>
        <BubbleContent>左へ寄せた吹き出し。</BubbleContent>
      </Bubble>
      <Bubble align={BUBBLE_ALIGN.END}>
        <BubbleContent>右へ寄せた吹き出し。</BubbleContent>
      </Bubble>
    </div>
  );
}

function InMessage() {
  return (
    <div className="flex flex-col gap-4">
      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarImage alt="" src={SAMPLE_AVATAR_URL} />
            <AvatarFallback>佐</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <MessageHeader>佐藤 12:04</MessageHeader>
          <Bubble variant={BUBBLE_VARIANT.OUTLINE}>
            <BubbleContent>受け取りました。</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
      <Message align={MESSAGE_ALIGN.END}>
        <MessageAvatar>
          <Avatar>
            <AvatarImage alt="" src={SAMPLE_AVATAR_URL} />
            <AvatarFallback>自</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <MessageHeader>自分 12:06</MessageHeader>
          <Bubble>
            <BubbleContent>ありがとうございます。お待ちしています。</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </div>
  );
}

function GhostInMessage() {
  return (
    <Message>
      <MessageContent>
        <MessageHeader>お知らせ 09:00</MessageHeader>
        <Bubble variant={BUBBLE_VARIANT.GHOST}>
          <BubbleContent>
            面を持たない吹き出しでは、見出しの左右の余白も外れて本文と行頭が揃います。
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

function PressableBubbles() {
  return (
    <div className="flex flex-col gap-3">
      <Bubble variant={BUBBLE_VARIANT.OUTLINE}>
        <BubbleContent asChild>
          <button type="button">押せる吹き出し（button）</button>
        </BubbleContent>
      </Bubble>
      <Bubble variant={BUBBLE_VARIANT.OUTLINE}>
        <BubbleContent asChild>
          <Link href="/terms">遷移する吹き出し（link）</Link>
        </BubbleContent>
      </Bubble>
    </div>
  );
}

function WithReactions() {
  return (
    <div className="flex flex-col gap-8 py-4">
      <Bubble variant={BUBBLE_VARIANT.OUTLINE}>
        <BubbleContent>下の縁へ重ねる場合。</BubbleContent>
        <BubbleReactions>
          <span aria-hidden="true">👍</span>
          <span>賛成 3 件</span>
        </BubbleReactions>
      </Bubble>
      <Bubble align={BUBBLE_ALIGN.END}>
        <BubbleContent>上の縁の左側へ重ねる場合。</BubbleContent>
        <BubbleReactions align={BUBBLE_ALIGN.START} side={BUBBLE_REACTIONS_SIDE.TOP}>
          <button type="button">
            <span aria-hidden="true">🎉</span>
            <span>祝う 1 件</span>
          </button>
        </BubbleReactions>
      </Bubble>
    </div>
  );
}

function GroupedBubbles() {
  return (
    <BubbleGroup>
      <Bubble variant={BUBBLE_VARIANT.OUTLINE}>
        <BubbleContent>確認しました。</BubbleContent>
      </Bubble>
      <Bubble variant={BUBBLE_VARIANT.OUTLINE}>
        <BubbleContent>追記です。締切は変更ありません。</BubbleContent>
      </Bubble>
    </BubbleGroup>
  );
}

function LongContentBubble() {
  return (
    <Bubble variant={BUBBLE_VARIANT.OUTLINE}>
      <BubbleContent>
        折り返しの確認用に長い本文を置いています。吹き出しの幅は領域の 80%
        を上限に内容へ合わせて縮み、区切りのない長い連続文字列
        AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA も枠を越えず単語の途中で折り返します。
      </BubbleContent>
    </Bubble>
  );
}

const meta = {
  title: "Display/Bubble",
  component: Bubble,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[32rem] max-w-[calc(100vw-2rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Bubble>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 内容の幅に合わせて縮む既定の吹き出し。 */
export const Default: Story = { render: () => <DefaultBubble /> };

/** 面の見せ方 7 種。いずれも見た目だけを変え、意味論は本文の文言が持つ。 */
export const Variants: Story = { render: () => <AllVariants /> };

/** `Message` の外で単独に使う場合の `align`。 */
export const Alignment: Story = { render: () => <BothAlignments /> };

/** `Message` の中に置いた場合。親の `align` に追従して左右へ寄る。 */
export const InsideMessage: Story = { render: () => <InMessage /> };

/** `ghost` を置いた場合。面が無くなり、`MessageHeader` の左右の余白も外れる。 */
export const GhostInsideMessage: Story = { render: () => <GhostInMessage /> };

/** `asChild` で button / link へ合成した押せる吹き出し。focus は outline で示す。 */
export const Pressable: Story = { render: () => <PressableBubbles /> };

/** 縁へ重ねる反応。`side` と `align` で重ねる位置を選ぶ。 */
export const Reactions: Story = { render: () => <WithReactions /> };

/** 1 件の発話を複数の吹き出しへ分けて並べる場合。 */
export const Grouped: Story = { render: () => <GroupedBubbles /> };

/** 上限幅と、区切りのない連続文字列の折り返し。 */
export const LongContent: Story = { render: () => <LongContentBubble /> };

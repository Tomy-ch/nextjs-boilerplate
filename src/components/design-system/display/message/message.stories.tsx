import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactNode } from "react";
import { Button } from "../../action/button/button";
import { BUTTON_SIZE, BUTTON_VARIANT } from "../../action/button/button.definition";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar/avatar";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "./message";
import { MESSAGE_ALIGN, type MessageAlign } from "./message.definition";

const SAMPLE_SRC = "/src/components/design-system/display/media-image/invertocat.png";

function SampleAvatar({ initial }: { initial: string }) {
  return (
    <MessageAvatar>
      <Avatar>
        <AvatarImage alt="" src={SAMPLE_SRC} />
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
    </MessageAvatar>
  );
}

function IncomingBubble({ children }: { children: ReactNode }) {
  return (
    <p className="w-fit max-w-[85%] rounded-lg bg-accent px-3 py-2 text-accent-foreground">
      {children}
    </p>
  );
}

function OutgoingBubble({ children }: { children: ReactNode }) {
  return (
    <p className="w-fit max-w-[85%] self-end rounded-lg bg-primary px-3 py-2 text-primary-foreground">
      {children}
    </p>
  );
}

function SingleMessage({ align }: { align?: MessageAlign }) {
  return (
    <Message align={align}>
      <SampleAvatar initial="佐" />
      <MessageContent>
        <MessageHeader>佐藤 12:04</MessageHeader>
        <IncomingBubble>受け取りました。内容を確認して折り返します。</IncomingBubble>
      </MessageContent>
    </Message>
  );
}

function BothAlignments() {
  return (
    <div className="flex flex-col gap-4">
      <Message align={MESSAGE_ALIGN.START}>
        <SampleAvatar initial="佐" />
        <MessageContent>
          <MessageHeader>佐藤 12:04</MessageHeader>
          <IncomingBubble>受け取りました。</IncomingBubble>
        </MessageContent>
      </Message>
      <Message align={MESSAGE_ALIGN.END}>
        <SampleAvatar initial="自" />
        <MessageContent>
          <MessageHeader>自分 12:06</MessageHeader>
          <OutgoingBubble>ありがとうございます。お待ちしています。</OutgoingBubble>
        </MessageContent>
      </Message>
    </div>
  );
}

function WithoutAvatarMessage() {
  return (
    <Message>
      <MessageContent>
        <MessageHeader>お知らせ 09:00</MessageHeader>
        <IncomingBubble>定期メンテナンスの予定を更新しました。</IncomingBubble>
      </MessageContent>
    </Message>
  );
}

function WithFooterMessage() {
  return (
    <Message align={MESSAGE_ALIGN.END}>
      <SampleAvatar initial="自" />
      <MessageContent>
        <MessageHeader>自分 12:06</MessageHeader>
        <OutgoingBubble>添付を差し替えました。</OutgoingBubble>
        <MessageFooter>
          送信できませんでした
          <Button className="ml-2" size={BUTTON_SIZE.SMALL} variant={BUTTON_VARIANT.GHOST}>
            再送する
          </Button>
        </MessageFooter>
      </MessageContent>
    </Message>
  );
}

function GroupedMessages() {
  return (
    <MessageGroup>
      <Message>
        <SampleAvatar initial="佐" />
        <MessageContent>
          <MessageHeader>佐藤 12:04</MessageHeader>
          <IncomingBubble>確認しました。</IncomingBubble>
        </MessageContent>
      </Message>
      <Message>
        <SampleAvatar initial="佐" />
        <MessageContent>
          <IncomingBubble>追記です。締切は変更ありません。</IncomingBubble>
        </MessageContent>
      </Message>
    </MessageGroup>
  );
}

function LongContentMessage() {
  return (
    <Message>
      <SampleAvatar initial="佐" />
      <MessageContent>
        <MessageHeader>佐藤 12:04</MessageHeader>
        <IncomingBubble>
          折り返しの確認用に長い本文を置いています。区切りのない長い連続文字列
          AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA も枠を越えず、単語の途中で折り返します。
        </IncomingBubble>
      </MessageContent>
    </Message>
  );
}

const meta = {
  title: "Display/Message",
  component: Message,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[32rem] max-w-[calc(100vw-2rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Message>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 送信者・時刻・本文を持つ既定のメッセージ。 */
export const Default: Story = { render: () => <SingleMessage /> };

/** `align` で avatar と本文の左右を入れ替える。向きは視覚的な区別だけで、送信者は文言が示す。 */
export const Alignment: Story = { render: () => <BothAlignments /> };

/** avatar を持たない場合。本文は content の幅を基準に置かれる。 */
export const WithoutAvatar: Story = { render: () => <WithoutAvatarMessage /> };

/** 本文の後ろへ送信状態と補助操作を添える場合。avatar は本文の高さに合わせて上へずれる。 */
export const WithFooter: Story = { render: () => <WithFooterMessage /> };

/** 同じ送信者の連続した発言を一つの塊として並べる場合。 */
export const Grouped: Story = { render: () => <GroupedMessages /> };

/** 一行に収まらない本文と、区切りのない連続文字列の折り返し。 */
export const LongContent: Story = { render: () => <LongContentMessage /> };

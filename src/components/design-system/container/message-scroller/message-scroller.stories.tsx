import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useState } from "react";
import { expect, within } from "storybook/test";
import { Button } from "../../action/button/button";
import { BUTTON_SIZE, BUTTON_VARIANT } from "../../action/button/button.definition";
import { Bubble, BubbleContent } from "../../display/bubble/bubble";
import { BUBBLE_VARIANT } from "../../display/bubble/bubble.definition";
import { Message, MessageContent, MessageHeader } from "../../display/message/message";
import { MESSAGE_ALIGN } from "../../display/message/message.definition";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerViewport,
} from "./message-scroller";

type Entry = { id: number; incoming: boolean; text: string };

function buildEntries(count: number): Entry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    incoming: index % 2 === 0,
    text: `${index + 1} 件目の発言です。`,
  }));
}

function EntryRow({ entry }: { entry: Entry }) {
  return (
    <Message align={entry.incoming ? MESSAGE_ALIGN.START : MESSAGE_ALIGN.END}>
      <MessageContent>
        <MessageHeader>
          {entry.incoming ? "佐藤" : "自分"} {entry.id + 1}
        </MessageHeader>
        <Bubble variant={entry.incoming ? BUBBLE_VARIANT.OUTLINE : BUBBLE_VARIANT.DEFAULT}>
          <BubbleContent>{entry.text}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

function ScrollerFixture({
  autoFollow,
  initialCount = 20,
}: {
  autoFollow?: boolean;
  initialCount?: number;
}) {
  const [entries, setEntries] = useState(() => buildEntries(initialCount));

  const append = useCallback(() => {
    setEntries((current) => [
      ...current,
      { id: current.length, incoming: current.length % 2 === 0, text: "追加された発言です。" },
    ]);
  }, []);

  return (
    <div className="flex w-[32rem] max-w-[calc(100vw-2rem)] flex-col gap-3">
      <MessageScroller autoFollow={autoFollow} className="h-80 rounded-lg border border-border p-4">
        <MessageScrollerViewport aria-label="やり取り">
          <MessageScrollerContent>
            {entries.map((entry) => (
              <EntryRow entry={entry} key={entry.id} />
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
      <Button onClick={append} size={BUTTON_SIZE.SMALL} variant={BUTTON_VARIANT.OUTLINE}>
        発言を 1 件追加する
      </Button>
    </div>
  );
}

function ShortFixture() {
  return (
    <div className="w-[32rem] max-w-[calc(100vw-2rem)]">
      <MessageScroller className="h-80 rounded-lg border border-border p-4">
        <MessageScrollerViewport aria-label="やり取り">
          <MessageScrollerContent>
            {buildEntries(2).map((entry) => (
              <EntryRow entry={entry} key={entry.id} />
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </div>
  );
}

function LabelledButtonFixture() {
  return (
    <div className="w-[32rem] max-w-[calc(100vw-2rem)]">
      <MessageScroller className="h-80 rounded-lg border border-border p-4">
        <MessageScrollerViewport aria-label="やり取り">
          <MessageScrollerContent>
            {buildEntries(20).map((entry) => (
              <EntryRow entry={entry} key={entry.id} />
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton>最新へ移動</MessageScrollerButton>
      </MessageScroller>
    </div>
  );
}

const meta = {
  title: "Container/MessageScroller",
  component: MessageScroller,
  parameters: { layout: "centered" },
} satisfies Meta<typeof MessageScroller>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 初期表示で末尾を映し、末尾にいる間は追加された発言へ追従する。 */
export const Default: Story = { render: () => <ScrollerFixture /> };

/**
 * 上へスクロールした状態。追従が外れて末尾へ戻す操作が現れ、発言を追加しても位置は動かない。
 */
export const ScrolledUp: Story = {
  render: () => <ScrollerFixture />,
  play: async ({ canvasElement }) => {
    const viewport = await within(canvasElement).findByRole("region", { name: "やり取り" });
    viewport.scrollTop = 0;
    // scrollTop の代入は scroll event を発火しない。追従の判定はその event で動く
    viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    await expect(
      await within(canvasElement).findByRole("button", { name: "最新へ移動" }),
    ).toBeVisible();
  },
};

/** `autoFollow` を切ると、末尾にいても追加された発言へ追従しない。 */
export const WithoutAutoFollow: Story = { render: () => <ScrollerFixture autoFollow={false} /> };

/** 内容が枠に収まる場合。スクロールできないため操作は現れない。 */
export const NotScrollable: Story = { render: () => <ShortFixture /> };

/** 末尾へ戻す操作に文言を与える場合。既定はアイコンと読み上げ用の文言だけを持つ。 */
export const LabelledButton: Story = { render: () => <LabelledButtonFixture /> };

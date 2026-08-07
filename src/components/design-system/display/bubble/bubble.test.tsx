// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Message, MessageContent, MessageHeader } from "../message/message";
import { MESSAGE_ALIGN } from "../message/message.definition";
import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from "./bubble";
import { BUBBLE_ALIGN, BUBBLE_REACTIONS_SIDE, BUBBLE_VARIANT } from "./bubble.definition";

describe("Bubble", () => {
  it("既定では default variant・start 向きの div として本文を表示する", () => {
    render(
      <Bubble data-testid="bubble">
        <BubbleContent>受け取りました。</BubbleContent>
      </Bubble>,
    );

    const bubble = screen.getByTestId("bubble");

    expect(bubble.tagName).toBe("DIV");
    expect(bubble).toHaveAttribute("data-slot", "bubble");
    expect(bubble).toHaveAttribute("data-variant", BUBBLE_VARIANT.DEFAULT);
    expect(bubble).toHaveAttribute("data-align", BUBBLE_ALIGN.START);
    expect(screen.getByText("受け取りました。")).toHaveAttribute("data-slot", "bubble-content");
  });

  it("variant と align を data 属性として公開する", () => {
    render(
      <Bubble align={BUBBLE_ALIGN.END} data-testid="bubble" variant={BUBBLE_VARIANT.DESTRUCTIVE}>
        <BubbleContent>送信できませんでした。</BubbleContent>
      </Bubble>,
    );

    const bubble = screen.getByTestId("bubble");

    expect(bubble).toHaveAttribute("data-variant", BUBBLE_VARIANT.DESTRUCTIVE);
    expect(bubble).toHaveAttribute("data-align", BUBBLE_ALIGN.END);
  });

  it("variant は見た目だけを変え、支援技術へは何の意味も伝えない", () => {
    const { container } = render(
      <Bubble variant={BUBBLE_VARIANT.DESTRUCTIVE}>
        <BubbleContent>送信できませんでした。</BubbleContent>
      </Bubble>,
    );

    expect(container.querySelectorAll("[role]")).toHaveLength(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("本文を複数置くと同じ吹き出しの中に並ぶ", () => {
    render(
      <Bubble data-testid="bubble">
        <BubbleContent>確認しました。</BubbleContent>
        <BubbleContent>追記です。</BubbleContent>
      </Bubble>,
    );

    expect(
      screen.getByTestId("bubble").querySelectorAll("[data-slot='bubble-content']"),
    ).toHaveLength(2);
  });

  it("asChild で button へ合成すると押せる吹き出しになる", () => {
    render(
      <Bubble>
        <BubbleContent asChild>
          <button type="button">返信する</button>
        </BubbleContent>
      </Bubble>,
    );

    const button = screen.getByRole("button", { name: "返信する" });

    expect(button).toHaveAttribute("data-slot", "bubble-content");
    expect(button).toBeEnabled();
  });

  it("asChild で link へ合成すると遷移先を持つ吹き出しになる", () => {
    render(
      <Bubble>
        <BubbleContent asChild>
          <Link href="/terms">利用条件を開く</Link>
        </BubbleContent>
      </Bubble>,
    );

    expect(screen.getByRole("link", { name: "利用条件を開く" })).toHaveAttribute("href", "/terms");
  });

  it("Message の中でも本文と送信者を読み上げ順のテキストとして残す", () => {
    render(
      <Message align={MESSAGE_ALIGN.END} data-testid="message">
        <MessageContent>
          <MessageHeader>自分 12:06</MessageHeader>
          <Bubble>
            <BubbleContent>お待ちしています。</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>,
    );

    expect(screen.getByTestId("message")).toHaveTextContent("自分 12:06お待ちしています。");
  });

  describe("Bubble の a11y", () => {
    it("a11y 自動検査に違反しない", async () => {
      const { container } = render(
        <BubbleGroup>
          <Bubble variant={BUBBLE_VARIANT.MUTED}>
            <BubbleContent>確認しました。</BubbleContent>
          </Bubble>
          <Bubble align={BUBBLE_ALIGN.END} variant={BUBBLE_VARIANT.OUTLINE}>
            <BubbleContent asChild>
              <button type="button">返信する</button>
            </BubbleContent>
            <BubbleReactions>
              <span aria-hidden="true">👍</span>
              <span>賛成 3 件</span>
            </BubbleReactions>
          </Bubble>
        </BubbleGroup>,
      );

      const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

      expect(result.violations).toEqual([]);
    });
  });
});

describe("BubbleGroup", () => {
  it("複数の吹き出しをまとまりとして含み、自身は role を持たない", () => {
    render(
      <BubbleGroup data-testid="group">
        <Bubble data-testid="first">
          <BubbleContent>確認しました。</BubbleContent>
        </Bubble>
        <Bubble data-testid="second">
          <BubbleContent>追記です。</BubbleContent>
        </Bubble>
      </BubbleGroup>,
    );

    const group = screen.getByTestId("group");

    expect(group).toHaveAttribute("data-slot", "bubble-group");
    expect(group).not.toHaveAttribute("role");
    expect(group).toContainElement(screen.getByTestId("first"));
    expect(group).toContainElement(screen.getByTestId("second"));
  });
});

describe("BubbleReactions", () => {
  it("既定では下の縁の右側へ重ねる", () => {
    render(
      <Bubble>
        <BubbleContent>確認しました。</BubbleContent>
        <BubbleReactions data-testid="reactions">賛成 3 件</BubbleReactions>
      </Bubble>,
    );

    const reactions = screen.getByTestId("reactions");

    expect(reactions).toHaveAttribute("data-slot", "bubble-reactions");
    expect(reactions).toHaveAttribute("data-side", BUBBLE_REACTIONS_SIDE.BOTTOM);
    expect(reactions).toHaveAttribute("data-align", BUBBLE_ALIGN.END);
  });

  it("side と align を data 属性として公開する", () => {
    render(
      <Bubble>
        <BubbleContent>確認しました。</BubbleContent>
        <BubbleReactions
          align={BUBBLE_ALIGN.START}
          data-testid="reactions"
          side={BUBBLE_REACTIONS_SIDE.TOP}
        >
          賛成 3 件
        </BubbleReactions>
      </Bubble>,
    );

    const reactions = screen.getByTestId("reactions");

    expect(reactions).toHaveAttribute("data-side", BUBBLE_REACTIONS_SIDE.TOP);
    expect(reactions).toHaveAttribute("data-align", BUBBLE_ALIGN.START);
  });

  it("絵文字を装飾として隠しても、反応の意味がテキストとして残る", () => {
    render(
      <Bubble>
        <BubbleContent>確認しました。</BubbleContent>
        <BubbleReactions>
          <span aria-hidden="true">👍</span>
          <span>賛成 3 件</span>
        </BubbleReactions>
      </Bubble>,
    );

    expect(screen.getByText("賛成 3 件")).toBeVisible();
    expect(screen.getByText("👍")).toHaveAttribute("aria-hidden", "true");
  });

  it("操作として置いた反応にアクセシブルな名前が付く", () => {
    render(
      <Bubble>
        <BubbleContent>確認しました。</BubbleContent>
        <BubbleReactions>
          <button type="button">
            <span aria-hidden="true">🎉</span>
            <span>祝う 1 件</span>
          </button>
        </BubbleReactions>
      </Bubble>,
    );

    expect(screen.getByRole("button")).toHaveAccessibleName("祝う 1 件");
  });
});

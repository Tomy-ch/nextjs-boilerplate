// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "./message";
import { MESSAGE_ALIGN } from "./message.definition";

describe("Message", () => {
  it("既定では start 向きの div として 1 件を表示する", () => {
    render(
      <Message data-testid="message">
        <MessageContent>
          <MessageHeader>佐藤 12:04</MessageHeader>
          <p>受け取りました。</p>
        </MessageContent>
      </Message>,
    );

    const message = screen.getByTestId("message");

    expect(message.tagName).toBe("DIV");
    expect(message).toHaveAttribute("data-align", MESSAGE_ALIGN.START);
  });

  it("align を data 属性として公開し、subcomponent の配置へ伝える", () => {
    render(
      <Message align={MESSAGE_ALIGN.END} data-testid="message">
        <MessageContent>
          <p>お待ちしています。</p>
        </MessageContent>
      </Message>,
    );

    expect(screen.getByTestId("message")).toHaveAttribute("data-align", MESSAGE_ALIGN.END);
  });

  it("送信者と本文を、向きに依存しない読み上げ順のテキストとして残す", () => {
    render(
      <Message align={MESSAGE_ALIGN.END} data-testid="message">
        <MessageAvatar>自</MessageAvatar>
        <MessageContent>
          <MessageHeader>自分 12:06</MessageHeader>
          <p>お待ちしています。</p>
        </MessageContent>
      </Message>,
    );

    expect(screen.getByTestId("message")).toHaveTextContent("自分 12:06お待ちしています。");
  });

  it("各領域を data-slot で識別できる", () => {
    render(
      <Message data-testid="message">
        <MessageAvatar data-testid="avatar">佐</MessageAvatar>
        <MessageContent data-testid="content">
          <MessageHeader data-testid="header">佐藤 12:04</MessageHeader>
          <p>受け取りました。</p>
          <MessageFooter data-testid="footer">送信済み</MessageFooter>
        </MessageContent>
      </Message>,
    );

    expect(screen.getByTestId("message")).toHaveAttribute("data-slot", "message");
    expect(screen.getByTestId("avatar")).toHaveAttribute("data-slot", "message-avatar");
    expect(screen.getByTestId("content")).toHaveAttribute("data-slot", "message-content");
    expect(screen.getByTestId("header")).toHaveAttribute("data-slot", "message-header");
    expect(screen.getByTestId("footer")).toHaveAttribute("data-slot", "message-footer");
  });

  it("avatar と各領域は role を持たず、支援技術には内容だけを渡す", () => {
    const { container } = render(
      <Message>
        <MessageAvatar>佐</MessageAvatar>
        <MessageContent>
          <MessageHeader>佐藤 12:04</MessageHeader>
          <p>受け取りました。</p>
        </MessageContent>
      </Message>,
    );

    expect(container.querySelectorAll("[role]")).toHaveLength(0);
    expect(screen.getByText("佐藤 12:04")).toBeVisible();
  });

  it("footer に置いた操作を button として到達できる", () => {
    render(
      <Message align={MESSAGE_ALIGN.END}>
        <MessageContent>
          <p>添付を差し替えました。</p>
          <MessageFooter>
            送信できませんでした
            <button type="button">再送する</button>
          </MessageFooter>
        </MessageContent>
      </Message>,
    );

    expect(screen.getByRole("button", { name: "再送する" })).toBeEnabled();
  });
});

describe("MessageGroup", () => {
  it("複数のメッセージをまとまりとして含み、自身は role を持たない", () => {
    render(
      <MessageGroup data-testid="group">
        <Message data-testid="first">
          <MessageContent>
            <p>確認しました。</p>
          </MessageContent>
        </Message>
        <Message data-testid="second">
          <MessageContent>
            <p>追記です。</p>
          </MessageContent>
        </Message>
      </MessageGroup>,
    );

    const group = screen.getByTestId("group");

    expect(group).toHaveAttribute("data-slot", "message-group");
    expect(group).not.toHaveAttribute("role");
    expect(group).toContainElement(screen.getByTestId("first"));
    expect(group).toContainElement(screen.getByTestId("second"));
  });

  it("呼び出し元が与えた role とアクセシブルな名前を保つ", () => {
    render(
      <MessageGroup aria-label="やり取り" role="list">
        <Message role="listitem">
          <MessageContent>
            <p>確認しました。</p>
          </MessageContent>
        </Message>
      </MessageGroup>,
    );

    expect(screen.getByRole("list", { name: "やり取り" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <MessageGroup>
        <Message>
          <MessageAvatar>佐</MessageAvatar>
          <MessageContent>
            <MessageHeader>佐藤 12:04</MessageHeader>
            <p>確認しました。</p>
            <MessageFooter>送信済み</MessageFooter>
          </MessageContent>
        </Message>
        <Message align={MESSAGE_ALIGN.END}>
          <MessageAvatar>自</MessageAvatar>
          <MessageContent>
            <MessageHeader>自分 12:06</MessageHeader>
            <p>ありがとうございます。</p>
          </MessageContent>
        </Message>
      </MessageGroup>,
    );

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

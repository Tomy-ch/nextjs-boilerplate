// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  List,
  ListItem,
  ListItemActions,
  ListItemContent,
  ListItemDescription,
  ListItemFooter,
  ListItemHeader,
  ListItemLink,
  ListItemMedia,
  ListItemTitle,
  ListSeparator,
} from "./list";
import { LIST_ITEM_MEDIA_VARIANT, LIST_ITEM_SIZE, LIST_ITEM_VARIANT } from "./list.definition";

function ListFixture() {
  return (
    <List>
      <ListItem>
        <ListItemMedia variant={LIST_ITEM_MEDIA_VARIANT.ICON}>
          <span aria-hidden="true">アイコン</span>
        </ListItemMedia>
        <ListItemContent>
          <ListItemTitle>通知</ListItemTitle>
          <ListItemDescription>新着や状態の変化をお知らせします。</ListItemDescription>
        </ListItemContent>
        <ListItemActions>
          <button type="button">設定</button>
        </ListItemActions>
      </ListItem>
      <ListSeparator />
      <ListItem>
        <ListItemContent>
          <ListItemTitle>二要素認証</ListItemTitle>
        </ListItemContent>
      </ListItem>
    </List>
  );
}

describe("List", () => {
  it("ul と li で一覧の意味論を提供する", () => {
    render(<ListFixture />);

    const list = screen.getByRole("list");

    expect(list.tagName).toBe("UL");
    expect(list).toHaveAttribute("data-slot", "list");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("行に媒体・見出し・説明・補助操作を組み立てる", () => {
    const { container } = render(<ListFixture />);

    expect(screen.getByText("通知")).toHaveAttribute("data-slot", "list-item-title");
    expect(screen.getByText("新着や状態の変化をお知らせします。")).toHaveAttribute(
      "data-slot",
      "list-item-description",
    );
    expect(container.querySelector("[data-slot='list-item-media']")).toHaveAttribute(
      "data-variant",
      LIST_ITEM_MEDIA_VARIANT.ICON,
    );
    expect(screen.getByRole("button", { name: "設定" })).toBeInTheDocument();
  });

  it("variant と size を data 属性として持つ", () => {
    const { container } = render(
      <List>
        <ListItem size={LIST_ITEM_SIZE.SMALL} variant={LIST_ITEM_VARIANT.OUTLINE}>
          <ListItemContent>
            <ListItemTitle>通知</ListItemTitle>
          </ListItemContent>
        </ListItem>
      </List>,
    );

    const item = container.querySelector("[data-slot='list-item']");

    expect(item).toHaveAttribute("data-variant", LIST_ITEM_VARIANT.OUTLINE);
    expect(item).toHaveAttribute("data-size", LIST_ITEM_SIZE.SMALL);
  });

  it("省略すると既定の variant と size になる", () => {
    const { container } = render(<ListFixture />);

    const item = container.querySelector("[data-slot='list-item']");

    expect(item).toHaveAttribute("data-variant", LIST_ITEM_VARIANT.DEFAULT);
    expect(item).toHaveAttribute("data-size", LIST_ITEM_SIZE.DEFAULT);
  });

  it("行全体を link にしても li を失わない", () => {
    render(
      <List>
        <ListItem>
          <ListItemLink asChild>
            <Link href="/settings">
              <ListItemContent>
                <ListItemTitle>通知設定</ListItemTitle>
              </ListItemContent>
            </Link>
          </ListItemLink>
        </ListItem>
      </List>,
    );

    const link = screen.getByRole("link", { name: "通知設定" });

    expect(link).toHaveAttribute("href", "/settings");
    expect(link).toHaveAttribute("data-slot", "list-item-link");
    expect(link.closest("li")).toHaveAttribute("data-slot", "list-item");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("外部リンクは asChild を使わず a を直接 render する", () => {
    render(
      <List>
        <ListItem>
          <ListItemLink href="https://example.com" rel="noreferrer" target="_blank">
            <ListItemContent>
              <ListItemTitle>外部の案内</ListItemTitle>
            </ListItemContent>
          </ListItemLink>
        </ListItem>
      </List>,
    );

    const link = screen.getByRole("link", { name: "外部の案内" });

    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("区切りは li として置かれ、読み上げ対象から外れる", () => {
    const { container } = render(<ListFixture />);

    const separator = container.querySelector("[data-slot='list-separator']");

    expect(separator?.tagName).toBe("LI");
    expect(separator).toHaveAttribute("aria-hidden", "true");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("asChild で ol へ合成して順序を伝えられる", () => {
    render(
      <List asChild>
        <ol>
          <ListItem>
            <ListItemContent>
              <ListItemTitle>住所を入力する</ListItemTitle>
            </ListItemContent>
          </ListItem>
        </ol>
      </List>,
    );

    const list = screen.getByRole("list");

    expect(list.tagName).toBe("OL");
    expect(list).toHaveAttribute("data-slot", "list");
  });

  it("header と footer を行の上下へ配置できる", () => {
    const { container } = render(
      <List>
        <ListItem>
          <ListItemHeader>セキュリティ</ListItemHeader>
          <ListItemContent>
            <ListItemTitle>二要素認証</ListItemTitle>
          </ListItemContent>
          <ListItemFooter>認証アプリを使用中</ListItemFooter>
        </ListItem>
      </List>,
    );

    expect(container.querySelector("[data-slot='list-item-header']")).toHaveTextContent(
      "セキュリティ",
    );
    expect(container.querySelector("[data-slot='list-item-footer']")).toHaveTextContent(
      "認証アプリを使用中",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ListFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });

  it("link を含む一覧も a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <List>
        <ListItem>
          <ListItemLink asChild>
            <Link href="/settings">
              <ListItemContent>
                <ListItemTitle>通知設定</ListItemTitle>
              </ListItemContent>
            </Link>
          </ListItemLink>
        </ListItem>
      </List>,
    );

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("ListItem", () => {
  // ----- 正常系 -----
  it("項目 1 件を listitem として描画する", () => {
    render(
      <List>
        <ListItem>本文</ListItem>
      </List>,
    );

    expect(screen.getByRole("listitem")).toHaveAttribute("data-slot", "list-item");
  });

  it("variant と size を data 属性として持たせる", () => {
    render(
      <List>
        <ListItem size={LIST_ITEM_SIZE.DEFAULT} variant={LIST_ITEM_VARIANT.DEFAULT}>
          本文
        </ListItem>
      </List>,
    );

    const item = screen.getByRole("listitem");

    expect(item).toHaveAttribute("data-variant", LIST_ITEM_VARIANT.DEFAULT);
    expect(item).toHaveAttribute("data-size", LIST_ITEM_SIZE.DEFAULT);
  });
});

describe("ListItemLink", () => {
  // ----- 正常系 -----
  it("行全体を遷移先にする link を描画する", () => {
    render(<ListItemLink href="/items/1">項目</ListItemLink>);

    const link = screen.getByRole("link", { name: "項目" });

    expect(link).toHaveAttribute("href", "/items/1");
    expect(link).toHaveAttribute("data-slot", "list-item-link");
  });

  it("asChild で渡した要素を link の実体にする", () => {
    render(
      <ListItemLink asChild>
        <Link href="/items/2">別の項目</Link>
      </ListItemLink>,
    );

    expect(screen.getByRole("link", { name: "別の項目" })).toHaveAttribute("href", "/items/2");
  });
});

describe("ListItemMedia", () => {
  // ----- 正常系 -----
  it("メディア枠として slot と variant を持つ要素を描画する", () => {
    const { container } = render(
      <ListItemMedia variant={LIST_ITEM_MEDIA_VARIANT.DEFAULT}>図</ListItemMedia>,
    );
    const media = container.querySelector('[data-slot="list-item-media"]');

    expect(media).not.toBeNull();
    expect(media).toHaveAttribute("data-variant", LIST_ITEM_MEDIA_VARIANT.DEFAULT);
  });
});

describe("ListItemContent", () => {
  // ----- 正常系 -----
  it("本文枠として slot を持つ要素を描画する", () => {
    render(<ListItemContent>本文</ListItemContent>);

    expect(screen.getByText("本文")).toHaveAttribute("data-slot", "list-item-content");
  });
});

describe("ListItemTitle", () => {
  // ----- 正常系 -----
  it("見出しとして slot を持つ要素を描画する", () => {
    render(<ListItemTitle>題名</ListItemTitle>);

    expect(screen.getByText("題名")).toHaveAttribute("data-slot", "list-item-title");
  });
});

describe("ListItemDescription", () => {
  // ----- 正常系 -----
  it("補足として slot を持つ要素を描画する", () => {
    render(<ListItemDescription>補足</ListItemDescription>);

    expect(screen.getByText("補足")).toHaveAttribute("data-slot", "list-item-description");
  });
});

describe("ListItemActions", () => {
  // ----- 正常系 -----
  it("操作枠として slot を持つ要素を描画する", () => {
    render(<ListItemActions>操作</ListItemActions>);

    expect(screen.getByText("操作")).toHaveAttribute("data-slot", "list-item-actions");
  });
});

describe("ListItemHeader", () => {
  // ----- 正常系 -----
  it("上段の枠として slot を持つ要素を描画する", () => {
    render(<ListItemHeader>上段</ListItemHeader>);

    expect(screen.getByText("上段")).toHaveAttribute("data-slot", "list-item-header");
  });
});

describe("ListItemFooter", () => {
  // ----- 正常系 -----
  it("下段の枠として slot を持つ要素を描画する", () => {
    render(<ListItemFooter>下段</ListItemFooter>);

    expect(screen.getByText("下段")).toHaveAttribute("data-slot", "list-item-footer");
  });
});

describe("ListSeparator", () => {
  // ----- 正常系 -----
  it("区切りを支援技術から隠して描画する", () => {
    const { container } = render(
      <List>
        <ListSeparator />
      </List>,
    );
    const separator = container.querySelector('[data-slot="list-separator"]');

    expect(separator).not.toBeNull();
    expect(separator).toHaveAttribute("aria-hidden", "true");
    expect(separator).toHaveAttribute("role", "presentation");
  });
});

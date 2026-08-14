// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "./avatar";
import { AVATAR_SIZE } from "./avatar.definition";

const originalImage = globalThis.Image;

/** jsdom は画像を実際に取得しないため、読み込み結果だけを差し替える。 */
function stubImageLoading(result: "loaded" | "error") {
  class StubImage extends EventTarget {
    complete = false;
    naturalWidth = 0;
    referrerPolicy = "";
    crossOrigin: string | null = null;

    set src(_value: string) {
      queueMicrotask(() => {
        this.complete = true;
        this.naturalWidth = result === "loaded" ? 64 : 0;
        this.dispatchEvent(new Event(result === "loaded" ? "load" : "error"));
      });
    }
  }

  vi.stubGlobal("Image", StubImage);
}

afterEach(() => {
  vi.stubGlobal("Image", originalImage);
});

describe("Avatar", () => {
  it("読み込みが終わるまでは代替表示を出す", () => {
    render(
      <Avatar>
        <AvatarImage alt="" src="/avatar.png" />
        <AvatarFallback>山田</AvatarFallback>
      </Avatar>,
    );

    expect(screen.getByText("山田")).toHaveAttribute("data-slot", "avatar-fallback");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("読み込みに成功すると画像へ切り替える", async () => {
    stubImageLoading("loaded");
    render(
      <Avatar>
        <AvatarImage alt="山田 太郎" src="/avatar.png" />
        <AvatarFallback>山田</AvatarFallback>
      </Avatar>,
    );

    const image = await screen.findByRole("img", { name: "山田 太郎" });

    expect(image).toHaveAttribute("src", "/avatar.png");
    expect(screen.queryByText("山田")).not.toBeInTheDocument();
  });

  it("読み込みに失敗すると代替表示のままにする", async () => {
    stubImageLoading("error");
    render(
      <Avatar>
        <AvatarImage alt="" src="/avatar.png" />
        <AvatarFallback>山田</AvatarFallback>
      </Avatar>,
    );

    await waitFor(() => {
      expect(screen.getByText("山田")).toBeInTheDocument();
    });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("装飾として使う場合は空の alt で読み上げ対象から外す", async () => {
    stubImageLoading("loaded");
    render(
      <div>
        <Avatar>
          <AvatarImage alt="" src="/avatar.png" />
          <AvatarFallback>山田</AvatarFallback>
        </Avatar>
        <span>山田 太郎</span>
      </div>,
    );

    await waitFor(() => {
      expect(document.querySelector("[data-slot='avatar-image']")).toBeInTheDocument();
    });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("size を data 属性として持つ", () => {
    const { container } = render(
      <Avatar size={AVATAR_SIZE.LARGE}>
        <AvatarFallback>山田</AvatarFallback>
      </Avatar>,
    );

    expect(container.querySelector("[data-slot='avatar']")).toHaveAttribute("data-size", "lg");
  });

  it("size を省略すると既定のサイズになる", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>山田</AvatarFallback>
      </Avatar>,
    );

    expect(container.querySelector("[data-slot='avatar']")).toHaveAttribute(
      "data-size",
      AVATAR_SIZE.DEFAULT,
    );
  });

  it("標識は読み上げ用の文言を子として受け取る", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>山田</AvatarFallback>
        <AvatarBadge>
          <span className="sr-only">オンライン</span>
        </AvatarBadge>
      </Avatar>,
    );

    expect(container.querySelector("[data-slot='avatar-badge']")).toBeInTheDocument();
    expect(screen.getByText("オンライン")).toHaveClass("sr-only");
  });

  it("group は複数の avatar と残数表示を並べる", () => {
    const { container } = render(
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>山田</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>佐藤</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+5</AvatarGroupCount>
      </AvatarGroup>,
    );

    expect(container.querySelector("[data-slot='avatar-group']")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-slot='avatar']")).toHaveLength(2);
    expect(container.querySelector("[data-slot='avatar-group-count']")).toHaveTextContent("+5");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <div className="flex items-center gap-2">
        <Avatar>
          <AvatarFallback>山田</AvatarFallback>
        </Avatar>
        <span>山田 太郎</span>
      </div>,
    );

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("AvatarImage", () => {
  it("読み込みに成功すると画像を表示する", async () => {
    stubImageLoading("loaded");
    render(
      <Avatar>
        <AvatarImage alt="担当者" src="/avatar.png" />
        <AvatarFallback>担</AvatarFallback>
      </Avatar>,
    );

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "担当者" })).toHaveAttribute(
        "data-slot",
        "avatar-image",
      );
    });
  });

  it("読み込みに失敗すると画像を表示しない", async () => {
    stubImageLoading("error");
    render(
      <Avatar>
        <AvatarImage alt="担当者" src="/avatar.png" />
        <AvatarFallback>担</AvatarFallback>
      </Avatar>,
    );

    await waitFor(() => {
      expect(screen.getByText("担")).toBeVisible();
    });
    expect(screen.queryByRole("img", { name: "担当者" })).toBeNull();
  });
});

describe("AvatarFallback", () => {
  it("代替表示として slot を持つ要素を描画する", () => {
    render(
      <Avatar>
        <AvatarFallback>担</AvatarFallback>
      </Avatar>,
    );

    expect(screen.getByText("担")).toHaveAttribute("data-slot", "avatar-fallback");
  });
});

describe("AvatarBadge", () => {
  it("状態を添える印として slot を持つ要素を描画する", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>担</AvatarFallback>
        <AvatarBadge />
      </Avatar>,
    );

    expect(container.querySelector('[data-slot="avatar-badge"]')).not.toBeNull();
  });
});

describe("AvatarGroup", () => {
  it("複数の avatar をまとめる枠として slot を持つ要素を描画する", () => {
    const { container } = render(
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>担</AvatarFallback>
        </Avatar>
      </AvatarGroup>,
    );

    expect(container.querySelector('[data-slot="avatar-group"]')).not.toBeNull();
  });
});

describe("AvatarGroupCount", () => {
  it("表示しきれない人数として slot を持つ要素を描画する", () => {
    render(
      <AvatarGroup>
        <AvatarGroupCount>+3</AvatarGroupCount>
      </AvatarGroup>,
    );

    expect(screen.getByText("+3")).toHaveAttribute("data-slot", "avatar-group-count");
  });
});

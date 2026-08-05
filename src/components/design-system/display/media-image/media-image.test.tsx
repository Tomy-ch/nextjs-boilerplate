// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { MediaImage } from "./media-image";
import { MEDIA_IMAGE_ASPECT_RATIO, MEDIA_IMAGE_ASPECT_RATIO_CLASS } from "./media-image.definition";

vi.mock("next/image", () => ({
  default: ({
    blurDataURL,
    fill,
    placeholder,
    preload,
    alt,
    ...props
  }: {
    alt: string;
    blurDataURL?: string;
    fill?: boolean;
    placeholder?: string;
    preload?: boolean;
    src: string;
  }) => (
    // biome-ignore lint/performance/noImgElement: next/image の test mock として DOM の img を返す。
    <img
      alt={alt}
      data-blur-data-url={blurDataURL}
      data-fill={String(fill)}
      data-placeholder={placeholder}
      data-preload={String(preload)}
      {...props}
    />
  ),
}));

describe("MediaImage", () => {
  it("比率固定の wrapper、実画像、CSS Skeleton を表示する", () => {
    render(<MediaImage alt="サンプル画像" src="/sample.svg" />);

    const image = screen.getByRole("img", { name: "サンプル画像" });
    const wrapper = image.closest("[data-slot=media-image]");

    expect(image).toHaveAttribute("data-fill", "true");
    if (wrapper === null) {
      throw new Error("MediaImage wrapper が見つかりません");
    }

    expect(wrapper.querySelector("[data-slot=skeleton]")).toHaveClass("absolute", "inset-0");
    expect(wrapper).toHaveClass("aspect-[4/3]");
  });

  it("preload 時は Skeleton を省略する", () => {
    render(
      <MediaImage
        alt="サンプル画像"
        aspectRatio={MEDIA_IMAGE_ASPECT_RATIO.WIDE}
        preload
        src="/sample.svg"
      />,
    );

    expect(screen.getByRole("img", { name: "サンプル画像" })).toHaveAttribute(
      "data-preload",
      "true",
    );
    const image = screen.getByRole("img", { name: "サンプル画像" });
    const wrapper = image.closest("[data-slot=media-image]");

    if (wrapper === null) {
      throw new Error("MediaImage wrapper が見つかりません");
    }

    expect(wrapper.querySelector("[data-slot=skeleton]")).not.toBeInTheDocument();
    expect(wrapper).toHaveClass("aspect-video");
  });

  it("明示された blur placeholder を next/image へ渡す", () => {
    render(
      <MediaImage
        alt="サンプル画像"
        blurDataURL="data:image/gif;base64,placeholder"
        placeholder="blur"
        src="/sample.svg"
      />,
    );

    expect(screen.getByRole("img", { name: "サンプル画像" })).toHaveAttribute(
      "data-placeholder",
      "blur",
    );
    expect(screen.getByRole("img", { name: "サンプル画像" })).toHaveAttribute(
      "data-blur-data-url",
      "data:image/gif;base64,placeholder",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<MediaImage alt="サンプル画像" src="/sample.svg" />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("公開する比率 class は、内容に押し広げられないよう溢れを切る", () => {
    for (const className of Object.values(MEDIA_IMAGE_ASPECT_RATIO_CLASS)) {
      expect(className).toContain("overflow-hidden");
    }
  });
});

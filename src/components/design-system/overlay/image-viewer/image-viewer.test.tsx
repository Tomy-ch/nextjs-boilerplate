// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Carousel, CarouselContent, CarouselItem } from "../../container/carousel/carousel";
import { ImageViewer, type ViewableImage } from "./image-viewer";

const IMAGES: readonly ViewableImage[] = [
  { src: "/first.png", alt: "1 枚目" },
  { src: "/second.png", alt: "2 枚目" },
  { src: "/third.png", alt: "3 枚目" },
];

/** carousel の中に置いた状態。位置の往復はこの形でしか起きない。 */
function renderInsideCarousel() {
  return render(
    <Carousel aria-label="画像">
      <CarouselContent>
        {IMAGES.map((image, index) => (
          <CarouselItem aria-label={`${index + 1} / ${IMAGES.length}`} key={image.alt}>
            <ImageViewer images={IMAGES} index={index}>
              <span>{image.alt}の縮小版</span>
            </ImageViewer>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>,
  );
}

/**
 * 本体の carousel に矩形と送りの記録を仕込む。jsdom は `scrollBy` を持たず（共有 setup が
 * no-op で補っている）、矩形も 0 になるため、寄せた量を観測するにはここで与えるしかない。
 */
function watchHost(): ReturnType<typeof vi.fn> {
  const content = document.querySelector('[data-slot="carousel-content"]');

  if (content === null) {
    throw new Error("本体の carousel がありません");
  }

  const scrollBy = vi.fn();

  content.scrollBy = scrollBy;
  content.getBoundingClientRect = () => new DOMRect(0, 0, 300, 300);

  for (const [index, slide] of [
    ...content.querySelectorAll('[data-slot="carousel-item"]'),
  ].entries()) {
    slide.getBoundingClientRect = () => new DOMRect(index * 300, 0, 300, 300);
  }

  return scrollBy;
}

/**
 * 拡大版の slide に矩形を与える。jsdom はレイアウトを計算せず矩形がすべて 0 になるため、
 * 「どの slide が見えているか」を実測で決める `currentSlideIndex` が常に先頭を返してしまう。
 * 送った先を占めている状態を寸法で与えて、位置の往復そのものを検証できるようにする。
 */
function showSlide(dialog: HTMLElement, position: number): void {
  const content = dialog.querySelector('[data-slot="carousel-content"]');

  if (content === null) {
    throw new Error("拡大版の carousel がありません");
  }

  content.getBoundingClientRect = () => new DOMRect(0, 0, 300, 300);

  for (const [index, slide] of [
    ...content.querySelectorAll('[data-slot="carousel-item"]'),
  ].entries()) {
    const left = (index - position) * 300;

    slide.getBoundingClientRect = () => new DOMRect(left, 0, 300, 300);
  }
}

describe("ImageViewer", () => {
  // ----- 正常系 -----
  it("縮小版を押せる操作として出す", () => {
    render(
      <ImageViewer images={IMAGES} index={0}>
        <span>縮小版</span>
      </ImageViewer>,
    );

    expect(screen.getByRole("button", { name: "1 枚目を拡大する" })).toBeVisible();
  });

  it("押すまで拡大版を描かない", () => {
    render(
      <ImageViewer images={IMAGES} index={0}>
        <span>縮小版</span>
      </ImageViewer>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("押すと拡大版を開き、画像の説明を名前にする", async () => {
    render(
      <ImageViewer images={IMAGES} index={1}>
        <span>縮小版</span>
      </ImageViewer>,
    );

    await userEvent.click(screen.getByRole("button", { name: "2 枚目を拡大する" }));

    expect(screen.getByRole("dialog")).toHaveAccessibleName("2 枚目");
  });

  it("拡大版に全部の画像を載せ、送れるようにする", async () => {
    render(
      <ImageViewer images={IMAGES} index={0}>
        <span>縮小版</span>
      </ImageViewer>,
    );

    await userEvent.click(screen.getByRole("button", { name: "1 枚目を拡大する" }));

    const dialog = within(screen.getByRole("dialog"));

    expect(dialog.getAllByRole("group")).toHaveLength(IMAGES.length);
    expect(dialog.getAllByRole("link", { name: "次へ" }).length).toBeGreaterThan(0);
  });

  it("Escape で閉じる", async () => {
    render(
      <ImageViewer images={IMAGES} index={0}>
        <span>縮小版</span>
      </ImageViewer>,
    );

    await userEvent.click(screen.getByRole("button", { name: "1 枚目を拡大する" }));
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("carousel の中でも、押した位置の trigger から開く", async () => {
    renderInsideCarousel();

    await userEvent.click(screen.getByRole("button", { name: "3 枚目を拡大する" }));

    expect(screen.getByRole("dialog")).toHaveAccessibleName("3 枚目");
  });

  it("carousel の中で閉じると、送り終えた位置の trigger へ focus を戻す", async () => {
    renderInsideCarousel();

    await userEvent.click(screen.getByRole("button", { name: "1 枚目を拡大する" }));
    await userEvent.keyboard("{Escape}");

    // 送っていないので、開いた位置の trigger がそのまま行き先になる。
    expect(screen.getByRole("button", { name: "1 枚目を拡大する" })).toHaveFocus();
  });

  it("拡大版で送ってから閉じると、送り終えた位置の trigger へ focus を移す", async () => {
    renderInsideCarousel();

    await userEvent.click(screen.getByRole("button", { name: "1 枚目を拡大する" }));
    showSlide(screen.getByRole("dialog"), 2);
    await userEvent.keyboard("{Escape}");

    expect(screen.getByRole("button", { name: "3 枚目を拡大する" })).toHaveFocus();
  });

  it("拡大版で送ってから閉じると、本体も送り終えた位置へ寄る", async () => {
    renderInsideCarousel();

    await userEvent.click(screen.getByRole("button", { name: "1 枚目を拡大する" }));

    const scrollBy = watchHost();

    showSlide(screen.getByRole("dialog"), 2);
    await userEvent.keyboard("{Escape}");

    // 3 枚目 (left=600) を先頭 (left=0) へ寄せるので 600。開いた位置のままなら 0 になる。
    expect(scrollBy).toHaveBeenCalledWith({ left: 600 });
  });

  it("carousel の外で閉じると、既定の focus 復帰に任せる", async () => {
    render(
      <ImageViewer images={IMAGES} index={0}>
        <span>縮小版</span>
      </ImageViewer>,
    );

    await userEvent.click(screen.getByRole("button", { name: "1 枚目を拡大する" }));
    await userEvent.keyboard("{Escape}");

    expect(screen.getByRole("button", { name: "1 枚目を拡大する" })).toHaveFocus();
  });

  it("slide を持たない領域に置かれても、寄せる相手が無いだけで落ちない", async () => {
    render(
      <Carousel aria-label="画像">
        <CarouselContent>
          <ImageViewer images={IMAGES} index={0}>
            <span>縮小版</span>
          </ImageViewer>
        </CarouselContent>
      </Carousel>,
    );

    await userEvent.click(screen.getByRole("button", { name: "1 枚目を拡大する" }));
    await userEvent.keyboard("{Escape}");

    expect(screen.getByRole("button", { name: "1 枚目を拡大する" })).toHaveFocus();
  });

  it("trigger は紙へ出さない", () => {
    render(
      <ImageViewer images={IMAGES} index={0}>
        <span>縮小版</span>
      </ImageViewer>,
    );

    expect(screen.getByRole("button", { name: "1 枚目を拡大する" })).toHaveClass("print-hidden");
  });

  it("a11y 違反が無い", async () => {
    const { container } = render(
      <ImageViewer images={IMAGES} index={0}>
        <span>縮小版</span>
      </ImageViewer>,
    );

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 異常系 -----
  it("枚数の外を指されたら何も描かない", () => {
    const { container } = render(
      <ImageViewer images={IMAGES} index={9}>
        <span>縮小版</span>
      </ImageViewer>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("画像が 1 枚も無ければ何も描かない", () => {
    const { container } = render(
      <ImageViewer images={[]} index={0}>
        <span>縮小版</span>
      </ImageViewer>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

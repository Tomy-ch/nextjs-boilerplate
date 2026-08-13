// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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

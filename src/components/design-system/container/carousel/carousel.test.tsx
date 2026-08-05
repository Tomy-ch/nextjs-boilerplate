// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { useId } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { Carousel, CarouselContent, CarouselItem, CarouselNav } from "./carousel";
import { CarouselLink, CarouselNext, CarouselPrevious } from "./carousel-navigation";

const SLIDES = [1, 2, 3];

function SlidesFixture({ itemClassName }: { itemClassName?: string }) {
  return (
    <Carousel aria-label="サンプル画像">
      <CarouselContent>
        {SLIDES.map((position) => (
          <CarouselItem
            aria-label={`${position} / ${SLIDES.length}`}
            className={itemClassName}
            key={position}
          >
            内容 {position}
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

function NavFixture() {
  const slideId = useId();

  return (
    <Carousel aria-label="サンプル画像">
      <CarouselContent>
        {SLIDES.map((position) => (
          <CarouselItem
            aria-label={`${position} / ${SLIDES.length}`}
            id={`${slideId}-${position}`}
            key={position}
          >
            内容 {position}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselNav aria-label="サンプル画像の送り">
        {SLIDES.map((position) => (
          <CarouselLink href={`#${slideId}-${position}`} key={position}>
            {position}
          </CarouselLink>
        ))}
      </CarouselNav>
    </Carousel>
  );
}

function StepFixture() {
  const slideId = useId();

  return (
    <Carousel aria-label="サンプル画像">
      <CarouselContent>
        {SLIDES.map((position) => (
          <CarouselItem
            aria-label={`${position} / ${SLIDES.length}`}
            id={`${slideId}-${position}`}
            key={position}
          >
            内容 {position}
            {position > 1 ? <CarouselPrevious href={`#${slideId}-${position - 1}`} /> : null}
            {position < SLIDES.length ? (
              <CarouselNext href={`#${slideId}-${position + 1}`} />
            ) : null}
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

describe("Carousel", () => {
  it("carousel として読み替える、名前のある region を公開する", () => {
    render(<SlidesFixture />);

    const carousel = screen.getByRole("region", { name: "サンプル画像" });

    expect(carousel).toHaveAttribute("aria-roledescription", "carousel");
    expect(carousel).toHaveAttribute("data-slot", "carousel");
  });

  it("slide を group として公開し、全体のどこかを名前で伝える", () => {
    render(<SlidesFixture />);

    const slide = screen.getByRole("group", { name: "2 / 3" });

    expect(slide).toHaveAttribute("aria-roledescription", "slide");
    expect(slide).toHaveAttribute("data-slot", "carousel-item");
  });

  it("送り領域は keyboard で到達でき、スクロールを親へ連鎖させない", () => {
    const { container } = render(<SlidesFixture />);

    const content = container.querySelector('[data-slot="carousel-content"]');

    expect(content).toHaveAttribute("tabindex", "0");
    expect(content).toHaveClass("overscroll-x-contain");
  });

  it("中身が focus 可能な要素だけのときは送り領域の tab stop を外せる", () => {
    const { container } = render(
      <Carousel aria-label="サンプル画像">
        <CarouselContent tabIndex={-1}>
          <CarouselItem aria-label="1 / 1">
            <a href="#detail">詳細</a>
          </CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    expect(container.querySelector('[data-slot="carousel-content"]')).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("slide は既定で領域いっぱいを占め、className で複数枚ぶんの幅へ変えられる", () => {
    const { rerender } = render(<SlidesFixture />);

    expect(screen.getByRole("group", { name: "1 / 3" })).toHaveClass("basis-full");

    rerender(<SlidesFixture itemClassName="basis-1/2" />);

    expect(screen.getByRole("group", { name: "1 / 3" })).toHaveClass("basis-1/2");
  });

  it("送りの link を名前のある集合として公開する", () => {
    render(<NavFixture />);

    const nav = screen.getByRole("list", { name: "サンプル画像の送り" });

    expect(nav).toHaveAttribute("data-slot", "carousel-nav");
    expect(screen.getAllByRole("link")).toHaveLength(SLIDES.length);
  });

  it("送りの link は実在する slide を指す", () => {
    render(<NavFixture />);

    for (const position of SLIDES) {
      const href = screen.getByRole("link", { name: String(position) }).getAttribute("href");
      const target = document.getElementById((href ?? "").slice(1));

      expect(target).toHaveAttribute("aria-roledescription", "slide");
      expect(target).toHaveAccessibleName(`${position} / ${SLIDES.length}`);
    }
  });

  it("端の送りは記号だけを描き、名前を aria-label で持つ", () => {
    render(<StepFixture />);

    expect(screen.getAllByRole("link", { name: "前へ" })).toHaveLength(SLIDES.length - 1);
    expect(screen.getAllByRole("link", { name: "次へ" })).toHaveLength(SLIDES.length - 1);
  });

  it("端の送りは隣り合う slide を指す", () => {
    const { container } = render(<StepFixture />);

    const items = [...container.querySelectorAll('[data-slot="carousel-item"]')];

    for (const [index, item] of items.entries()) {
      const previous = item.querySelector('[data-slot="carousel-previous"]');
      const next = item.querySelector('[data-slot="carousel-next"]');

      expect(previous?.getAttribute("href") ?? null).toBe(
        index === 0 ? null : `#${items[index - 1].id}`,
      );
      expect(next?.getAttribute("href") ?? null).toBe(
        index === items.length - 1 ? null : `#${items[index + 1].id}`,
      );
    }
  });

  it("端の送りの名前を呼び出し元が言い換えられる", () => {
    render(
      <CarouselItem aria-label="1 / 2">
        <CarouselNext aria-label="次の画像へ" href="#next" />
      </CarouselItem>,
    );

    expect(screen.getByRole("link", { name: "次の画像へ" })).toHaveAttribute("href", "#next");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<NavFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });

  it("端の送りを置いても a11y 自動検査に違反しない", async () => {
    const { container } = render(<StepFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

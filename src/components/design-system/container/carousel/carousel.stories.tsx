import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useId } from "react";

import { MediaImage } from "../../display/media-image/media-image";
import { MEDIA_IMAGE_ASPECT_RATIO } from "../../display/media-image/media-image.definition";
import { Carousel, CarouselContent, CarouselItem, CarouselNav } from "./carousel";
import {
  CarouselLink,
  CarouselNext,
  CarouselPrevious,
  CarouselThumbnails,
} from "./carousel-navigation";

const SLIDE_COUNT = 4;
const SLIDES = Array.from({ length: SLIDE_COUNT }, (_, index) => index + 1);

function ImageSlides({ itemClassName }: { itemClassName?: string }) {
  return (
    <>
      {SLIDES.map((position) => (
        <CarouselItem
          aria-label={`${position} / ${SLIDE_COUNT}`}
          className={itemClassName}
          key={position}
        >
          <MediaImage
            alt="サンプルのロゴ"
            aspectRatio={MEDIA_IMAGE_ASPECT_RATIO.SQUARE}
            sizes="20rem"
            src="/src/components/design-system/display/media-image/invertocat.png"
          />
        </CarouselItem>
      ))}
    </>
  );
}

function NavigableCarousel() {
  const slideId = useId();

  return (
    <Carousel aria-label="サンプル画像" className="w-80">
      <CarouselContent>
        {SLIDES.map((position) => (
          <CarouselItem
            aria-label={`${position} / ${SLIDE_COUNT}`}
            id={`${slideId}-${position}`}
            key={position}
          >
            <MediaImage
              alt="サンプルのロゴ"
              aspectRatio={MEDIA_IMAGE_ASPECT_RATIO.SQUARE}
              sizes="20rem"
              src="/src/components/design-system/display/media-image/invertocat.png"
            />
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

function SteppableCarousel() {
  const slideId = useId();

  return (
    <Carousel aria-label="サンプル画像" className="w-80">
      <CarouselContent>
        {SLIDES.map((position) => (
          <CarouselItem
            aria-label={`${position} / ${SLIDE_COUNT}`}
            id={`${slideId}-${position}`}
            key={position}
          >
            <MediaImage
              alt="サンプルのロゴ"
              aspectRatio={MEDIA_IMAGE_ASPECT_RATIO.SQUARE}
              sizes="20rem"
              src="/src/components/design-system/display/media-image/invertocat.png"
            />
            {position > 1 ? <CarouselPrevious href={`#${slideId}-${position - 1}`} /> : null}
            {position < SLIDE_COUNT ? <CarouselNext href={`#${slideId}-${position + 1}`} /> : null}
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

function ThumbnailCarousel({
  carouselClassName = "w-80",
  linkClassName = "w-16 shrink-0 p-0",
  thumbnailsClassName,
}: {
  carouselClassName?: string;
  linkClassName?: string;
  thumbnailsClassName?: string;
}) {
  const slideId = useId();

  return (
    <Carousel aria-label="サンプル画像" className={carouselClassName}>
      <CarouselContent>
        {SLIDES.map((position) => (
          <CarouselItem
            aria-label={`${position} / ${SLIDE_COUNT}`}
            id={`${slideId}-${position}`}
            key={position}
          >
            <MediaImage
              alt="サンプルのロゴ"
              aspectRatio={MEDIA_IMAGE_ASPECT_RATIO.SQUARE}
              sizes="20rem"
              src="/src/components/design-system/display/media-image/invertocat.png"
            />
            {position > 1 ? <CarouselPrevious href={`#${slideId}-${position - 1}`} /> : null}
            {position < SLIDE_COUNT ? <CarouselNext href={`#${slideId}-${position + 1}`} /> : null}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselThumbnails
        aria-label="画像の一覧"
        className={thumbnailsClassName}
        defaultCurrentId={`${slideId}-1`}
      >
        {SLIDES.map((position) => (
          <CarouselLink
            aria-label={`${position} 枚目`}
            className={linkClassName}
            href={`#${slideId}-${position}`}
            key={position}
          >
            <MediaImage
              alt=""
              aspectRatio={MEDIA_IMAGE_ASPECT_RATIO.SQUARE}
              className="w-full"
              sizes="4rem"
              src="/src/components/design-system/display/media-image/invertocat.png"
            />
          </CarouselLink>
        ))}
      </CarouselThumbnails>
    </Carousel>
  );
}

const meta = {
  title: "Container/Carousel",
  component: Carousel,
  parameters: { layout: "centered" },
  args: {
    "aria-label": "サンプル画像",
    className: "w-80",
    children: (
      <CarouselContent>
        <ImageSlides />
      </CarouselContent>
    ),
  },
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 一枚ずつ送る既定の形。scrollbar・drag・矢印キーで送る。 */
export const Default: Story = {};

/** 目的の slide を直接指す link を添える場合。link は表示中の slide を示す状態を持たない。 */
export const WithNav: Story = { render: () => <NavigableCarousel /> };

/**
 * slide の左右端に一つ前・一つ次への操作を重ねる場合。行き先のない端では要素ごと置かない。
 */
export const WithStepControls: Story = { render: () => <SteppableCarousel /> };

/**
 * 下に送り先の一覧を並べ、表示中の slide に追従させる場合。一覧の画像を押すと main 側が動き、
 * main を送ると一覧の印が移る。
 */
export const WithThumbnails: Story = { render: () => <ThumbnailCarousel /> };

/**
 * 一覧の位置・余白・大きさを変えた場合。専用の props は持たず、`Carousel` の `flex-*` と `gap-*` が
 * main との並びと間隔を、`CarouselThumbnails` の `gap-*` と `justify-*` が一覧の中の並びを、
 * `CarouselLink` の `w-*` と `p-*` がサムネイル自身の大きさを決める。`justify-center` は一覧が
 * 収まる場合にだけ使う。溢れる幅で中央寄せにすると、先頭側がスクロールしても現れなくなる。
 */
export const ThumbnailLayout: Story = {
  render: () => (
    <ThumbnailCarousel
      carouselClassName="w-96 flex-col-reverse gap-6"
      linkClassName="w-20 shrink-0 p-0"
      thumbnailsClassName="justify-center gap-2"
    />
  ),
};

/** 複数枚を並べたまま送る場合。送り幅は slide の `basis-*` が決め、隙間のぶんを差し引く。 */
export const MultipleVisible: Story = {
  args: {
    children: (
      <CarouselContent>
        <ImageSlides itemClassName="basis-[calc(50%-0.5rem)]" />
      </CarouselContent>
    ),
  },
};

/** 画像以外の内容。slide の中身は問わない。 */
export const TextContent: Story = {
  args: {
    children: (
      <CarouselContent>
        {SLIDES.map((position) => (
          <CarouselItem aria-label={`${position} / ${SLIDE_COUNT}`} key={position}>
            <div className="rounded-md border border-border p-4">
              <p className="font-emphasis text-sm">見出し {position}</p>
              <p className="mt-1 text-muted-foreground text-sm">
                slide の中身は carousel が決めない。要約・数値・操作など、順に読ませたい内容を置く。
              </p>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    ),
  },
};

/**
 * slide の中身が focus 可能な要素だけの場合。子を辿れば browser が自動でスクロールするため、
 * 領域自体の tab stop を `tabIndex={-1}` で外す。
 */
export const FocusableContent: Story = {
  args: {
    children: (
      <CarouselContent tabIndex={-1}>
        {SLIDES.map((position) => (
          <CarouselItem aria-label={`${position} / ${SLIDE_COUNT}`} key={position}>
            <a className="block rounded-md border border-border p-4 text-sm underline" href="#top">
              項目 {position} の詳細
            </a>
          </CarouselItem>
        ))}
      </CarouselContent>
    ),
  },
};

"use client";

import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useScrollDirection } from "@/capabilities/use-scroll-direction";
import { cn } from "@/components/cn";
import { APP_SHELL_HEADER_HEIGHT } from "@/components/shell/app-shell/app-shell.definition";

/** 貼り付いている帯と、その下に続く領域が止まる位置。 */
type StickyRegion = {
  /** 検索の帯を出しているか。 */
  readonly shown: boolean;
  /** 検索の帯の高さ。出していないあいだも最後に測った値を持つ。 */
  readonly barHeight: number;
  /** 検索の帯が自分の高さを知らせる。 */
  readonly reportBarHeight: (height: number) => void;
};

/** 止まった要素と、その上にあるものとの間に空ける余白（px）。 */
const GAP = 12;

const StickyRegionContext = createContext<StickyRegion | null>(null);

function useRegion(): StickyRegion {
  const region = use(StickyRegionContext);

  if (region === null) {
    throw new Error("ProductStickyRegion の外で貼り付きの状態を読もうとしました");
  }

  return region;
}

/**
 * 貼り付く領域をひとまとめにする。
 *
 * @remarks
 * 検索の帯と脇の絞り込みは、画面の別の列にありながら**上端を取り合います**。帯が出ているあいだ
 * 絞り込みはその下で止まり、帯が退いたら header の直下まで上がります。取り合う相手の高さは
 * 条件の数で変わる（条件が折り返すと帯が伸びる）ため、値を書き写さず測った値を配ります。
 */
export function ProductStickyRegion({ children }: { children: ReactNode }) {
  const shown = useScrollDirection() === "up";
  const [barHeight, setBarHeight] = useState(0);
  const reportBarHeight = useCallback((height: number) => setBarHeight(height), []);
  const region = useMemo(
    () => ({ shown, barHeight, reportBarHeight }),
    [shown, barHeight, reportBarHeight],
  );

  return <StickyRegionContext value={region}>{children}</StickyRegionContext>;
}

/**
 * 検索と並び替えの帯。
 *
 * @remarks
 * **下へ読み進めるあいだは退きます。** その間に見たいのは商品であり、検索し直す構えには入って
 * いません。上へ戻ろうとした時点で header の直下に現れるので、条件を変えたくなればすぐ届きます。
 *
 * 退き方は「貼り付くのをやめる」ことで表します。位置をずらして隠すと、まだ本来の位置に居る
 * （画面の先頭に近い）ときにも見出しへ重なって上がってしまいます。貼り付きをやめるだけなら、
 * 本来の位置より上へは決して行きません。
 *
 * 背景を敷きます。貼り付いているあいだ商品がこの下を通るため、透けると文字が重なって読めません。
 */
export function ProductStickyBar({ children }: { children: ReactNode }) {
  const { shown, reportBarHeight } = useRegion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = ref.current;

    if (target === null) {
      return;
    }

    const observer = new ResizeObserver(() => reportBarHeight(target.offsetHeight));

    observer.observe(target);

    return () => observer.disconnect();
  }, [reportBarHeight]);

  return (
    <div
      className={cn("z-30 bg-background", shown ? "sticky" : "static")}
      data-testid="product-sticky-bar"
      ref={ref}
      style={shown ? { top: APP_SHELL_HEADER_HEIGHT } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * 脇に常設する絞り込みの居場所。
 *
 * @remarks
 * **読み進めても手元に残します。** 商品を見ながら条件を変えるのがこの画面の主な流れで、絞り込みが
 * 画面外へ去ると、変えるたびに先頭へ戻ることになります。
 *
 * 止まる位置は検索の帯の下です。帯が退いているあいだは header の直下まで上がります。
 *
 * **画面に収まらない高さになったら、自分の中で送ります。** 分類が増えると絞り込みは画面より高く
 * なり得ますが、外側の送りは商品のためのものなので、そちらに任せると絞り込みの下端へ到達できま
 * せん。確定の操作はその送りの下端に貼り付くため、どれだけ分類が並んでも押せる位置に残ります。
 */
export function ProductStickyAside({ children }: { children: ReactNode }) {
  const { shown, barHeight } = useRegion();
  const top = APP_SHELL_HEADER_HEIGHT + (shown ? barHeight : 0) + GAP;

  return (
    <aside aria-label="絞り込み条件" className="hidden w-64 shrink-0 lg:block">
      <div
        className="sticky overflow-y-auto"
        style={{ maxHeight: `calc(100dvh - ${top + GAP}px)`, top }}
      >
        {children}
      </div>
    </aside>
  );
}

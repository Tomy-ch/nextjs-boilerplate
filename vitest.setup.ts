import "@testing-library/jest-dom/vitest";
import { act, cleanup, configure } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

// テストから外へ出る取得を、宛先を名指しして落とす。**応答は作らない。**
//
// HTTP を止めるのは MSW で、立てるのは要るファイルだけである（`vitest.setup.msw.ts`）。誰が読み込み、
// なぜ全ファイルへ掛けないかは `docs/testing-conventions.md`「mock の境界」が持つ。
//
// 据えるのが hook なのは、`vitest.setup.msw.ts` を読み込んだファイルでは MSW が module の評価時に
// 先に席を取り、ここが何もしないで済むようにするためである。応答を自分で作るテスト
// （`vi.stubGlobal` / `vi.spyOn`）も同じく席を取るので、この判定には掛からない。
//
// 拒み方が reject ではなく throw なのは、外への取得を握り潰す `catch` を素通りさせないためである
// （本物の `fetch` は同期に throw しない）。
const realFetch = globalThis.fetch;

beforeAll(() => {
  if (globalThis.fetch !== realFetch) {
    return;
  }

  globalThis.fetch = ((input: RequestInfo | URL): never => {
    const target = input instanceof Request ? input.url : String(input);

    throw new Error(
      `テストから ${target} へ取得に出ようとしました。この宛先を止めるには、` +
        "`vitest.setup.msw.ts` を import して契約のハンドラを割り当ててください。",
    );
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
});

// 非同期の待ち時間を既定の 1 秒から広げる。既定は 1 ファイルを単独で回す想定の値で、全量を並列で
// 回したときの取り合いを含んでいない。混み合うと、待っている相手が現れる前に打ち切られ、落ちる
// ファイルが実行のたびに入れ替わる形で現れる。
//
// **待ちの中に module の読み込みを入れないこと。** `next/dynamic` で読む部品は解決に数百 ms 掛かり、
// 混み具合でその何倍にもなる。ここを広げて吸収させると、必要な余裕が「読み込みの遅さ」で決まって
// しまう。描く側のテストが先に解決しておく（`docs/testing-conventions.md`）。
//
// テスト 1 件の上限（5 秒）より短くしてあるのは、本当に現れない要素をここで先に打ち切り、
// 「何が見つからなかったか」を出すためである。上限に先に当たると、その情報が出ない。
configure({ asyncUtilTimeout: 3000 });

vi.mock("server-only", () => ({}));

// jsdom は Pointer Events の capture API を実装しない。ドラッグを扱う部品（vaul の drawer など）は
// pointerdown で setPointerCapture を呼ぶため、実際の入力列を再現する user-event がそこで落ちる。
// 回避のために click だけを直接発火させると、ドラッグ判定の経路を 1 行も通らないテストになる。
// jsdom は transform の計算値を空文字で返す。vaul は `style.transform || style.webkitTransform ||
// style.mozTransform` の形で読むため、空文字だと undefined へ落ちて文字列操作で例外になる。
if (typeof window !== "undefined") {
  const computeStyle = window.getComputedStyle.bind(window);

  window.getComputedStyle = ((element: Element, pseudoElement?: string | null) => {
    const style = computeStyle(element, pseudoElement ?? undefined);

    if (style.transform === "") {
      style.transform = "none";
    }

    return style;
  }) as typeof window.getComputedStyle;
}

// jsdom は matchMedia を実装しない。幅や入力方式で見せ方を変える部品は購読の時点で例外になり、
// 検証したい分岐まで届かない。個別のテストで補うと、同じ形のスタブが部品の数だけ増える。
//
// 既定を「一致しない」にするのは、jsdom がレイアウトを持たず、どの条件も評価できないためである。
// 一致する側の振る舞いを確かめたいテストは、そのケースだけ `vi.stubGlobal` で上書きする
// （幅や入力方式の想定はケースごとに明示する）。購読と解除を受け付けるのは、条件の変化を追う
// 部品が effect の後片付けで `removeEventListener` を呼ぶためで、無いと unmount で落ちる。
if (typeof window !== "undefined" && window.matchMedia === undefined) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

// jsdom は ResizeObserver も実装しない。自分の大きさを測ってから描く部品は mount の時点で例外に
// なる。何も通知しないのは、jsdom がレイアウトを持たず大きさが変わる瞬間そのものが存在しない
// ためで、大きさに依存する分岐を確かめたいテストはそのケースだけ上書きする。
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

/** 疑似 touch の 1 点。ジェスチャーの判定が読む値だけを持つ。 */
export type StubTouch = {
  /** 指の識別子。複数指のうちどれが動いたかを判定に使う。 */
  readonly identifier: number;
  readonly clientY: number;
};

/**
 * touch の入力列を発火する。
 *
 * @remarks
 * jsdom は `TouchEvent` も `Touch` も実装しないため、`window` へ流す形をここで組み立てます。
 * 個別のテストで発火方法を変えると、ジェスチャー判定の経路を通らないテストが生まれるので、
 * 補いは 1 箇所に置きます。
 *
 * `touches` は画面に触れている指、`changedTouches` はその発火で状態が変わった指という
 * ブラウザの区別をそのまま持ちます。省略時に前者を後者へ流用するのは、指が 1 本のときは
 * 両者が一致するためです。
 */
export function dispatchTouch(
  type: "touchstart" | "touchmove" | "touchend" | "touchcancel",
  init: { touches?: readonly StubTouch[]; changedTouches?: readonly StubTouch[] } = {},
): void {
  const touches = init.touches ?? [];
  const event = Object.assign(new Event(type), {
    touches,
    changedTouches: init.changedTouches ?? touches,
  });

  act(() => {
    window.dispatchEvent(event);
  });
}

if (typeof Element !== "undefined" && Element.prototype.setPointerCapture === undefined) {
  const captured = new WeakMap<Element, Set<number>>();

  Element.prototype.setPointerCapture = function setPointerCapture(pointerId: number): void {
    const ids = captured.get(this) ?? new Set<number>();

    ids.add(pointerId);
    captured.set(this, ids);
  };

  Element.prototype.releasePointerCapture = function releasePointerCapture(
    pointerId: number,
  ): void {
    captured.get(this)?.delete(pointerId);
  };

  Element.prototype.hasPointerCapture = function hasPointerCapture(pointerId: number): boolean {
    return captured.get(this)?.has(pointerId) ?? false;
  };
}

// jsdom はスクロールの API を実装しない。carousel の送りは領域の横スクロールそのものなので、
// 送る操作・拡大表示・追従する一覧はいずれもここを通る。個別のテストで呼び出しを避けると、
// 位置を合わせる経路を 1 行も通らないテストになる。
//
// 記録も再現もしないのは、jsdom がレイアウトを持たず矩形がすべて 0 になり、スクロール量に
// 意味を与えられないためである。**量そのものが主題のテストは矩形を明示して単体で検証する**
// （`carousel-scroll.test.ts`）。ここが担うのは、経路を通せるようにすることだけである。
if (typeof Element !== "undefined" && Element.prototype.scrollBy === undefined) {
  Element.prototype.scrollBy = function scrollBy(): void {
    // 意図的に空。
  };
}

// 要素を視野へ入れる API も同じく無い。押した場所を視野に残す部品は、畳んだ直後の次の frame で
// 呼ぶ。frame の到達は実行の混み具合で決まるため、補わないと**同じ木が回すたびに落ちたり
// 落ちなかったりする**。呼び出しを記録したいテストは、そのファイルで `vi.fn()` を被せる。
if (typeof Element !== "undefined" && Element.prototype.scrollIntoView === undefined) {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {
    // 意図的に空。
  };
}

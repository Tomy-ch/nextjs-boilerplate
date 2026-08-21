import "@testing-library/jest-dom/vitest";
import { act, cleanup, configure } from "@testing-library/react";
import { HttpResponse, http, type JsonBodyType, passthrough } from "msw";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { mockServer } from "./mocks/node";

// dev サーバーと同じ契約駆動ハンドラをテストでも使う。テスト専用のスタブを別に持つと、
// 契約が変わってもテストだけが古い形のまま通り続ける。
//
// ハンドラの無い宛先は落とす。素通しにすると、宛先を打ち間違えた取得が本物の網へ出ていき、
// 手元では届いて CI では時間切れになるという形で現れる。fetch を直接差し替えているテストは
// MSW に届く前に自分で応答を作るため、この判定には掛からない。
beforeAll(() => {
  mockServer.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  mockServer.resetHandlers();
});

afterAll(() => {
  mockServer.close();
});

/**
 * 契約のパス 1 本に応答を割り当て、そこへ届いた要求を記録する。
 *
 * @remarks
 * HTTP を止めるのは MSW だけです（`docs/testing-conventions.md`）。応答の形を手で組み立てる
 * スタブを `fetch` へ被せると、契約が変わってもテストだけが古い形のまま通り続けます。ここが
 * 差し替えるのは「この 1 本がこの応答を返す」ことだけで、止める位置は契約駆動のハンドラと
 * 同じ HTTP 境界に揃ったままです。
 *
 * 記録を返すのは、組み立てたクエリを確かめる先が要求そのものだからです。`fetch` へ渡した引数を
 * 見ると、URL を組み立てる責務が誰にあるかと無関係に「呼び方」を固定してしまいます。
 *
 * 追加したハンドラは `resetHandlers()` が毎テスト後に取り除きます。
 *
 * @param url - 割り当てる絶対 URL。クエリ文字列は照合に使われない
 * @param body - JSON として返す応答本文
 * @returns 届いた要求。呼び出しの順に積まれる
 */
export function serveJson(url: string, body: JsonBodyType): readonly Request[] {
  const requests: Request[] = [];

  mockServer.use(
    http.get(url, ({ request }) => {
      requests.push(request);

      return HttpResponse.json(body);
    }),
  );

  return requests;
}

/** 書き込みに使う HTTP メソッド。 */
export type WriteMethod = "post" | "patch" | "put" | "delete";

/**
 * 書き込み 1 本に応答を割り当て、届いた要求を記録する。
 *
 * @remarks
 * {@link serveJson} の書き込み版です。分けてあるのは、記録する要求の**複製**を積むためです。
 * 本文を持つ要求は読み出しが 1 度きりで、記録した側と検証する側が同じ実体を見ると、先に読んだ
 * 方だけが中身を得ます。
 *
 * @param method - 割り当てるメソッド
 * @param url - 割り当てる絶対 URL。動的な区間は `:name` で表す
 * @param body - JSON として返す応答本文
 * @returns 届いた要求の複製。呼び出しの順に積まれる
 */
export function serveWrite(
  method: WriteMethod,
  url: string,
  body: JsonBodyType,
): readonly Request[] {
  const requests: Request[] = [];

  mockServer.use(
    http[method](url, ({ request }) => {
      requests.push(request.clone());

      return HttpResponse.json(body);
    }),
  );

  return requests;
}

/**
 * 書き込み 1 本に、本文を持たない失敗の status を割り当てる。
 *
 * @remarks
 * 生の status を扱えるのは HTTP 境界だけです。内側は分類済みのエラーしか見ないため
 * （[0080](docs/adr/0080-error-handling.md)）、正規化の入口を確かめるにはここで status を
 * 与えるしかありません。
 *
 * @param method - 割り当てるメソッド
 * @param url - 割り当てる絶対 URL
 * @param status - 返す HTTP status
 */
export function serveWriteStatus(method: WriteMethod, url: string, status: number): void {
  mockServer.use(http[method](url, () => new HttpResponse(null, { status })));
}

/**
 * 指定した origin 宛の要求を素通しさせる。
 *
 * @remarks
 * ハンドラの無い宛先を落とす既定（`onUnhandledRequest: "error"`）に対する、唯一の逃げ道です。
 * テスト自身が立てた本物のサーバへ出す要求は、差し替えるべき外部ではなく検証対象そのものなので、
 * 宛先を名指しして開けます。
 *
 * 既定の側を緩めて済ませないのは、緩めると宛先を打ち間違えた取得まで一緒に通ってしまい、
 * 手元では本物の網へ届き CI では時間切れになるという形でしか現れなくなるためです。
 *
 * @param origin - 素通しさせる scheme + host + port
 */
export function passThroughOrigin(origin: string): void {
  mockServer.use(http.all(`${origin}/*`, () => passthrough()));
}

// 非同期の待ち時間を既定の 1 秒から広げる。`next/dynamic` で読む部品は
// 描画のたびに実際の module 解決を挟むため、待つ相手が DOM の更新だけではない。全量を並列で
// 回すと解決が 1 秒を超えることがあり、落ちるファイルが実行のたびに入れ替わる形で現れる。
//
// 既定は同期的な DOM の更新を待つ想定の値で、module 解決の分を含んでいない。テスト側で待ち方を
// 変えて回避すると、同じ回避が dynamic を使う部品の数だけ増える。
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

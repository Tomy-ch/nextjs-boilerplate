import type { Page } from "@playwright/test";
import { MINIMAL_VIEWPORTS, RESPONSIVE_VIEWPORT_VALUE } from "storybook/viewport";

/**
 * story が宣言した viewport を、撮影する寸法へ落とす。
 *
 * @remarks
 * **viewport の globals は preview へ届きません。** 幅を変えるのは Storybook の manager が
 * iframe を囲む枠を縮めることで行われ、撮影が開く素の `iframe.html` には枠が無いためです。
 * 撮る側が Playwright の viewport を合わせない限り、`Mobile` と名の付く story も desktop の
 * 幅で撮られ、基準画像は Default と 1 バイトも違わないものになります。
 */

/** 撮影する寸法。 */
export type ViewportSize = {
  /** 幅（px）。 */
  width: number;
  /** 高さ（px）。 */
  height: number;
};

/** viewport 1 件の定義。Storybook の `styles` と同じ形。 */
type ViewportDefinition = {
  styles?: { width?: string; height?: string };
};

/**
 * story が宣言した viewport。
 *
 * @remarks
 * `options` を併せて受け取るのは、**その story だけが持ち込む定義があるため**です
 * （`parameters.viewport.options`）。組み込みの一覧だけを見ると、自分で名前を決めた viewport が
 * 「定義の無い名前」として落ちます。
 */
export type ViewportDeclaration = {
  /** 選ばれている viewport の名前。 */
  value?: string;
  /** その story が持ち込む定義。 */
  options?: Record<string, ViewportDefinition>;
};

/** `"414px"` の形を数へ落とす。px 以外は撮影の寸法にできない。 */
function toPixels(length: string | undefined): number | undefined {
  if (length === undefined) return undefined;

  const matched = /^(\d+(?:\.\d+)?)px$/.exec(length.trim());

  return matched === null ? undefined : Math.round(Number(matched[1]));
}

/**
 * 宣言を寸法へ写す。宣言が無ければ `undefined` を返し、撮る側は設定の既定のまま撮る。
 *
 * @remarks
 * **名前が解決できないときは例外を投げます。** 既定へ落とすと、綴りを誤った story が
 * 「desktop で撮られた絵」を基準画像として持ち、その後どの実行も気づけません。
 */
export function resolveViewport(
  declaration: ViewportDeclaration | undefined,
): ViewportSize | undefined {
  const value = declaration?.value;
  if (value === undefined || value === "" || value === RESPONSIVE_VIEWPORT_VALUE) return undefined;

  const definition: ViewportDefinition | undefined =
    declaration?.options?.[value] ??
    (MINIMAL_VIEWPORTS as Record<string, ViewportDefinition | undefined>)[value];
  if (definition === undefined) {
    throw new Error(
      `viewport の定義が見つかりません: ${value}。組み込みの一覧に無い名前は、その story の ` +
        "`parameters.viewport.options` で定義してください。",
    );
  }

  const width = toPixels(definition.styles?.width);
  const height = toPixels(definition.styles?.height);
  if (width === undefined || height === undefined) {
    throw new Error(
      `viewport の寸法を px として読めません: ${value}。撮影は画素数を要求するので、` +
        "`styles` の width / height は px で書いてください。",
    );
  }

  return { width, height };
}

/**
 * 描き終えた story が宣言した viewport を読む。
 *
 * @remarks
 * **目録（`index.json`）には出ません。** story ごとの `globals` は目録へ書き出されないため、
 * 読める場所が描画側しかありません。
 *
 * 読むのは描画済みの render で、story の store は触りません。store は index が揃うまで getter が
 * 例外を投げ、Storybook 自身が直接の利用を非推奨としています。
 */
export async function readViewportDeclaration(
  page: Pick<Page, "evaluate">,
): Promise<ViewportDeclaration | undefined> {
  return page.evaluate(() => {
    const render = (
      globalThis as unknown as {
        __STORYBOOK_PREVIEW__?: {
          storyRenders?: {
            story?: {
              storyGlobals?: { viewport?: { value?: string } };
              parameters?: {
                viewport?: {
                  options?: Record<string, { styles?: { width?: string; height?: string } }>;
                };
              };
            };
          }[];
        };
      }
    ).__STORYBOOK_PREVIEW__?.storyRenders?.[0];

    const story = render?.story;
    if (story === undefined) return undefined;

    return {
      options: story.parameters?.viewport?.options,
      value: story.storyGlobals?.viewport?.value,
    };
  });
}

/**
 * story が宣言した幅で開き直す。開き直したときだけ `true` を返す。
 *
 * @remarks
 * 描き終えてからでないと宣言を読めないので、寸法を変える story だけ 2 度開くことになります。
 *
 * **開き直すのが要点です。** 幅を器から決める部品（一覧の段組みなど）は mount の時点で段数を
 * 決めるため、`setViewportSize` だけでは最初の幅で決めた姿が残ります。
 */
export async function openAtDeclaredViewport(
  page: Pick<Page, "evaluate" | "goto" | "setViewportSize">,
  url: string,
): Promise<boolean> {
  const size = resolveViewport(await readViewportDeclaration(page));
  if (size === undefined) return false;

  await page.setViewportSize(size);
  await page.goto(url);

  return true;
}

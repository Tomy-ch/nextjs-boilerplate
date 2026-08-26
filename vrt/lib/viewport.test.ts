import { RESPONSIVE_VIEWPORT_VALUE } from "storybook/viewport";
import { describe, expect, it } from "vitest";

import { openAtDeclaredViewport, readViewportDeclaration, resolveViewport } from "./viewport";

describe("resolveViewport", () => {
  // ----- 正常系 -----
  it("組み込みの名前を寸法へ写す", () => {
    expect(resolveViewport({ value: "mobile2" })).toEqual({ height: 896, width: 414 });
  });

  it("story が持ち込んだ定義を組み込みより先に見る", () => {
    expect(
      resolveViewport({
        options: { mobile2: { styles: { height: "100px", width: "200px" } } },
        value: "mobile2",
      }),
    ).toEqual({ height: 100, width: 200 });
  });

  it("組み込みに無い名前でも、story が定義していれば写す", () => {
    expect(
      resolveViewport({
        options: { narrow: { styles: { height: "640px", width: "420px" } } },
        value: "narrow",
      }),
    ).toEqual({ height: 640, width: 420 });
  });

  it("小数の px を丸めて返す", () => {
    expect(
      resolveViewport({
        options: { x: { styles: { height: "10.4px", width: "20.6px" } } },
        value: "x",
      }),
    ).toEqual({ height: 10, width: 21 });
  });

  it("宣言が無ければ寸法を決めない", () => {
    expect(resolveViewport(undefined)).toBeUndefined();
    expect(resolveViewport({})).toBeUndefined();
  });

  it("幅いっぱいの指定は寸法を決めない", () => {
    expect(resolveViewport({ value: RESPONSIVE_VIEWPORT_VALUE })).toBeUndefined();
  });

  // ----- 異常系 -----
  it("定義の無い名前は落とす", () => {
    expect(() => resolveViewport({ value: "typo" })).toThrow(/viewport の定義が見つかりません/);
  });

  it("px で書かれていない寸法は落とす", () => {
    expect(() =>
      resolveViewport({
        options: { x: { styles: { height: "50%", width: "10rem" } } },
        value: "x",
      }),
    ).toThrow(/px として読めません/);
  });

  it("寸法を持たない定義は落とす", () => {
    expect(() => resolveViewport({ options: { x: {} }, value: "x" })).toThrow(
      /px として読めません/,
    );
  });
});

/** preview の store を持つブラウザに見立てて、`evaluate` に渡された関数をその場で走らせる。 */
function pageWithPreview(preview: unknown) {
  return {
    evaluate: async <Result>(fn: () => Result) => {
      const holder = globalThis as unknown as { __STORYBOOK_PREVIEW__?: unknown };
      holder.__STORYBOOK_PREVIEW__ = preview;
      try {
        return await fn();
      } finally {
        holder.__STORYBOOK_PREVIEW__ = undefined;
      }
    },
  };
}

/** その story を描き終えた preview。 */
function previewOf(story: unknown) {
  return { storyRenders: [{ story }] };
}

describe("readViewportDeclaration", () => {
  // ----- 正常系 -----
  it("選ばれている名前と、story が持ち込んだ定義を返す", async () => {
    const page = pageWithPreview(
      previewOf({
        parameters: {
          viewport: { options: { narrow: { styles: { height: "1px", width: "2px" } } } },
        },
        storyGlobals: { viewport: { value: "narrow" } },
      }),
    );

    expect(await readViewportDeclaration(page)).toEqual({
      options: { narrow: { styles: { height: "1px", width: "2px" } } },
      value: "narrow",
    });
  });

  it("宣言を持たない story では名前も定義も返さない", async () => {
    const page = pageWithPreview(previewOf({}));

    expect(await readViewportDeclaration(page)).toEqual({
      options: undefined,
      value: undefined,
    });
  });

  // ----- 異常系 -----
  it("まだ何も描かれていなければ何も返さない", async () => {
    const page = pageWithPreview({ storyRenders: [] });

    expect(await readViewportDeclaration(page)).toBeUndefined();
  });
});

describe("openAtDeclaredViewport", () => {
  /** 呼ばれた寸法と URL を控えるだけのブラウザ。 */
  function recordingPage(preview: unknown) {
    const calls: { goto: string[]; sizes: { height: number; width: number }[] } = {
      goto: [],
      sizes: [],
    };

    return {
      calls,
      page: {
        ...pageWithPreview(preview),
        goto: async (url: string) => {
          calls.goto.push(url);
          return null;
        },
        setViewportSize: async (size: { height: number; width: number }) => {
          calls.sizes.push(size);
        },
      },
    };
  }

  // ----- 正常系 -----
  it("宣言された寸法へ変えてから開き直す", async () => {
    const { calls, page } = recordingPage(
      previewOf({ storyGlobals: { viewport: { value: "mobile2" } } }),
    );

    expect(await openAtDeclaredViewport(page, "/iframe.html?id=any--story")).toBe(true);

    expect(calls.sizes).toEqual([{ height: 896, width: 414 }]);
    expect(calls.goto).toEqual(["/iframe.html?id=any--story"]);
  });

  it("宣言が無ければ寸法も変えず、開き直しもしない", async () => {
    const { calls, page } = recordingPage(previewOf({}));

    expect(await openAtDeclaredViewport(page, "/iframe.html?id=any--story")).toBe(false);

    expect(calls.sizes).toEqual([]);
    expect(calls.goto).toEqual([]);
  });
});

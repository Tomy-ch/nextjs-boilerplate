// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MEASUREMENT_ID_COOKIE_NAME } from "@/model/consent";

// 島は遷移を合図に計測 id を渡し直すため、経路を要求する。合図そのものはここの観点では
// ないので、供給だけを差し替える。遷移を起こすケースがあるので値を動かせる形にする。
const navigation = vi.hoisted(() => ({ pathname: "/about" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

/**
 * 容器 ID を差し替えて島を読み込み直す。
 *
 * @remarks
 * 容器 ID は module の読み込み時に一度だけ置換されるため、値を変えるには module ごと作り直す。
 */
async function loadIsland(containerId: string) {
  vi.stubEnv("NEXT_PUBLIC_ANALYTICS_GTM_CONTAINER_ID", containerId);
  vi.resetModules();

  // 島が動的に読む module を先に解決する（`docs/testing-conventions.md`「`next/dynamic` を含む
  // 木を描くとき」）。`beforeAll` に置けないのは、ここで毎回 registry を作り直して先読みが
  // 捨てられるためで、作り直した直後に読む。
  await import("@next/third-parties/google");

  return (await import("./analytics")).Analytics;
}

/**
 * 差し込まれた script のうち、タグマネージャの配信元を指すもの。
 *
 * @remarks
 * **`render()` が返す container ではなく `document.body` 全体を見ます。** `next/script` は
 * `afterInteractive` では要素を返さず、effect から `document.body` へ直に append するため、
 * container の子孫には現れません。
 */
function tagManagerScripts(): Element[] {
  return [...document.body.querySelectorAll("script")].filter((script) =>
    (script.getAttribute("src") ?? "").includes("googletagmanager.com"),
  );
}

/** GTM へ渡した値の並び。型はライブラリが `Window` へ宣言している。 */
function dataLayer(): object[] {
  return window.dataLayer ?? [];
}

afterEach(() => {
  vi.unstubAllEnvs();
  navigation.pathname = "/about";
  document.cookie = `${MEASUREMENT_ID_COOKIE_NAME}=; max-age=0; path=/`;
  // 渡した値と差し込まれた script は次のケースへ持ち越さない。
  window.dataLayer = undefined;
  for (const script of document.body.querySelectorAll("script")) {
    script.remove();
  }
});

describe("Analytics", () => {
  it("容器 ID を宣言した配備では、タグマネージャを afterInteractive で読み込む", async () => {
    const Analytics = await loadIsland("GTM-ABC1234");

    const { container } = render(<Analytics />);

    await waitFor(() => expect(tagManagerScripts()).toHaveLength(1));
    expect(tagManagerScripts()[0]?.getAttribute("data-nscript")).toBe("afterInteractive");
    // 読み込んでも器の見た目には何も足さない。a11y の自動検査を置かないのはこれが前提で、
    // 前提そのものをここで固定する（`telemetry.tsx` と同じ形）。
    expect(container).toBeEmptyDOMElement();
  });

  it("容器 ID が空なら何も描かない。読み込まないという指定である", async () => {
    const Analytics = await loadIsland("");

    const { container } = render(<Analytics />);

    // 読み込みは動的なので、起きる余地を与えてから「起きていない」を見る。
    await act(async () => undefined);

    expect(container).toBeEmptyDOMElement();
    expect(tagManagerScripts()).toHaveLength(0);
  });

  it("配られている計測 id を dataLayer へ渡す", async () => {
    document.cookie = `${MEASUREMENT_ID_COOKIE_NAME}=649689b1-c53d-4c4e-9335-c3758e51703c; path=/`;
    const Analytics = await loadIsland("GTM-ABC1234");

    render(<Analytics />);

    await waitFor(() =>
      expect(dataLayer()).toContainEqual({
        [MEASUREMENT_ID_COOKIE_NAME]: "649689b1-c53d-4c4e-9335-c3758e51703c",
      }),
    );
  });

  it("形の合わない値は渡さない。この cookie は httpOnly を付けられず、書ける相手が居る", async () => {
    document.cookie = `${MEASUREMENT_ID_COOKIE_NAME}=</script><script>x=1</script>; path=/`;
    const Analytics = await loadIsland("GTM-ABC1234");

    render(<Analytics />);
    await act(async () => undefined);

    expect(dataLayer().some((entry) => MEASUREMENT_ID_COOKIE_NAME in entry)).toBe(false);
  });

  it("遷移しても同じ id は二度渡さない。GTM 側で別々の出来事として並ぶため", async () => {
    document.cookie = `${MEASUREMENT_ID_COOKIE_NAME}=649689b1-c53d-4c4e-9335-c3758e51703c; path=/`;
    const Analytics = await loadIsland("GTM-ABC1234");
    const { rerender } = render(<Analytics />);
    await waitFor(() =>
      expect(dataLayer().filter((entry) => MEASUREMENT_ID_COOKIE_NAME in entry)).toHaveLength(1),
    );

    navigation.pathname = "/products";
    rerender(<Analytics />);
    await act(async () => undefined);

    expect(dataLayer().filter((entry) => MEASUREMENT_ID_COOKIE_NAME in entry)).toHaveLength(1);
  });

  it("計測 id がまだ配られていなければ渡さない。同意した直後の 1 回がこれにあたる", async () => {
    const Analytics = await loadIsland("GTM-ABC1234");

    render(<Analytics />);

    await act(async () => undefined);

    expect(dataLayer().some((entry) => MEASUREMENT_ID_COOKIE_NAME in entry)).toBe(false);
  });
});

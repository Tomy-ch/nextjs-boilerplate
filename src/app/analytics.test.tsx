// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MEASUREMENT_ID_COOKIE_NAME } from "@/model/consent";

// 島は遷移を合図に計測 id を渡し直すため、経路を要求する。合図そのものはここの観点では
// ないので、供給だけを差し替える。
vi.mock("next/navigation", () => ({ usePathname: () => "/about" }));

/**
 * 容器 ID を差し替えて島を読み込み直す。
 *
 * @remarks
 * 容器 ID は module の読み込み時に一度だけ置換されるため、値を変えるには module ごと作り直す。
 */
async function loadIsland(containerId: string) {
  vi.stubEnv("NEXT_PUBLIC_ANALYTICS_GTM_CONTAINER_ID", containerId);
  vi.resetModules();

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
  document.cookie = `${MEASUREMENT_ID_COOKIE_NAME}=; max-age=0; path=/`;
  // 渡した値と差し込まれた script は次のケースへ持ち越さない。
  window.dataLayer = undefined;
  for (const script of document.body.querySelectorAll("script")) {
    script.remove();
  }
});

describe("Analytics", () => {
  it("容器 ID を宣言した配備では、タグマネージャを読み込む", async () => {
    const Analytics = await loadIsland("GTM-ABC1234");

    render(<Analytics />);

    expect(tagManagerScripts()).toHaveLength(1);
  });

  it("容器 ID が空なら何も描かない。読み込まないという指定である", async () => {
    const Analytics = await loadIsland("");

    const { container } = render(<Analytics />);

    expect(container).toBeEmptyDOMElement();
    expect(tagManagerScripts()).toHaveLength(0);
  });

  it("配られている計測 id を dataLayer へ渡す", async () => {
    document.cookie = `${MEASUREMENT_ID_COOKIE_NAME}=649689b1-c53d-4c4e-9335-c3758e51703c; path=/`;
    const Analytics = await loadIsland("GTM-ABC1234");

    render(<Analytics />);

    expect(dataLayer()).toContainEqual({
      [MEASUREMENT_ID_COOKIE_NAME]: "649689b1-c53d-4c4e-9335-c3758e51703c",
    });
  });

  it("計測 id がまだ配られていなければ渡さない。同意した直後の 1 回がこれにあたる", async () => {
    const Analytics = await loadIsland("GTM-ABC1234");

    render(<Analytics />);

    expect(dataLayer().some((entry) => MEASUREMENT_ID_COOKIE_NAME in entry)).toBe(false);
  });
});

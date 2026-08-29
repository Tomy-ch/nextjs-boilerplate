// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MEASUREMENT_ID_COOKIE_NAME } from "@/model/consent";

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

/** 描かれた script のうち、タグマネージャの配信元を指すもの。 */
function tagManagerScripts(container: HTMLElement): Element[] {
  return [...container.querySelectorAll("script")].filter((script) =>
    (script.getAttribute("src") ?? "").includes("googletagmanager.com"),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  document.cookie = `${MEASUREMENT_ID_COOKIE_NAME}=; max-age=0; path=/`;
});

describe("Analytics", () => {
  it("容器 ID を宣言した配備では、タグマネージャを読み込む", async () => {
    const Analytics = await loadIsland("GTM-ABC1234");

    const { container } = render(<Analytics />);

    expect(tagManagerScripts(container)).toHaveLength(1);
  });

  it("容器 ID が空なら何も描かない。読み込まないという指定である", async () => {
    const Analytics = await loadIsland("");

    const { container } = render(<Analytics />);

    expect(container).toBeEmptyDOMElement();
  });

  it("配られている計測 id を dataLayer へ渡す", async () => {
    document.cookie = `${MEASUREMENT_ID_COOKIE_NAME}=649689b1-c53d-4c4e-9335-c3758e51703c; path=/`;
    const Analytics = await loadIsland("GTM-ABC1234");

    const { container } = render(<Analytics />);

    expect(container.innerHTML).toContain("649689b1-c53d-4c4e-9335-c3758e51703c");
  });

  it("計測 id がまだ配られていなければ渡さない。同意した直後の 1 回がこれにあたる", async () => {
    const Analytics = await loadIsland("GTM-ABC1234");

    const { container } = render(<Analytics />);

    expect(container.innerHTML).not.toContain(MEASUREMENT_ID_COOKIE_NAME);
  });
});

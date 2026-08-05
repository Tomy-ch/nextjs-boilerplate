// @vitest-environment jsdom

import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mountPortal, PORTAL_LOAD_ERROR_MESSAGE } from "./mount-portal";

const docs = {
  title: "Documentation",
  subtitle: "boilerplate",
  groups: [
    {
      title: "Architecture",
      slug: "architecture",
      sections: [
        {
          id: "adr",
          slug: "adr",
          title: "ADR",
          items: [{ name: "ADR 0001", path: "./guides/0001.md", lang: "all" }],
        },
      ],
    },
  ],
};

function createContainer(): HTMLElement {
  const container = document.createElement("div");

  document.body.append(container);

  return container;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("mountPortal", () => {
  it("生成物を取得してビューアーを描画する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(docs) })),
    );

    await mountPortal(createContainer());

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Documentation" })).toBeInTheDocument(),
    );
  });

  it("取得に失敗したら読み込めなかったことと応答の状態を伝える", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
    );

    const container = createContainer();

    await mountPortal(container);

    expect(container.textContent).toContain(PORTAL_LOAD_ERROR_MESSAGE);
    expect(container.textContent).toContain("500");
  });

  it("生成物の形が違えば読み込めなかったことを伝える", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ title: "x" }) })),
    );

    const container = createContainer();

    await mountPortal(container);

    expect(container.textContent).toContain(PORTAL_LOAD_ERROR_MESSAGE);
  });

  it("取得そのものが失敗した場合も原因を画面へ残す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("接続できません"))),
    );

    const container = createContainer();

    await mountPortal(container);

    expect(container.textContent).toContain("接続できません");
  });

  it("Error ではない値が投げられても原因を画面へ残す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject("想定外")),
    );

    const container = createContainer();

    await mountPortal(container);

    expect(container.textContent).toContain("想定外");
  });
});

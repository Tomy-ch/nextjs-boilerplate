// @vitest-environment jsdom

import { act, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import type { Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { mountPortal, PORTAL_LOAD_ERROR_MESSAGE } from "./mount-portal";

const { mountedRoots } = vi.hoisted(() => ({ mountedRoots: [] as Root[] }));

// `mountPortal` は root を返さないので、`createRoot` を差し替えて生成物を捕まえる。畳む理由は
// `docs/testing-conventions.md` の「テストが起こしたものはテストが畳む」が持つ。
vi.mock("react-dom/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom/client")>();

  return {
    ...actual,
    createRoot: ((...args: Parameters<typeof actual.createRoot>) => {
      const root = actual.createRoot(...args);

      mountedRoots.push(root);

      return root;
    }) as typeof actual.createRoot,
  };
});

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

const server = setupServer();

function createContainer(): HTMLElement {
  const container = document.createElement("div");

  document.body.append(container);

  return container;
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  act(() => {
    for (const root of mountedRoots.splice(0)) {
      root.unmount();
    }
  });
  server.resetHandlers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

afterAll(() => server.close());

describe("mountPortal", () => {
  // ----- 生成物を読めたとき -----
  it("生成物を取得してビューアーを描画する", async () => {
    server.use(http.get("*/docs.json", () => HttpResponse.json(docs)));

    await mountPortal(createContainer());

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1, name: "Documentation" })).toBeInTheDocument(),
    );
  });

  // ----- 生成物を読めなかったとき -----
  it("取得に失敗したら読み込めなかったことと応答の状態を伝える", async () => {
    server.use(http.get("*/docs.json", () => new HttpResponse(null, { status: 500 })));

    const container = createContainer();

    await mountPortal(container);

    expect(container.textContent).toContain(PORTAL_LOAD_ERROR_MESSAGE);
    expect(container.textContent).toContain("500");
  });

  it("応答は返っても本文が JSON として壊れていれば、解釈できなかったことを伝える", async () => {
    server.use(
      http.get(
        "*/docs.json",
        () =>
          new HttpResponse("not json {{{", {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );

    const container = createContainer();

    await mountPortal(container);

    expect(container.textContent).toContain(PORTAL_LOAD_ERROR_MESSAGE);
    expect(container.textContent).toContain("is not valid JSON");
  });

  it("生成物の形が違えば、どの項目が違うかまで伝える", async () => {
    server.use(http.get("*/docs.json", () => HttpResponse.json({ title: "x" })));

    const container = createContainer();

    await mountPortal(container);

    expect(container.textContent).toContain(PORTAL_LOAD_ERROR_MESSAGE);
    expect(container.textContent).toContain("groups");
  });

  it("取得そのものが失敗した場合も原因を画面へ残す", async () => {
    server.use(http.get("*/docs.json", () => HttpResponse.error()));

    const container = createContainer();

    await mountPortal(container);

    expect(container.textContent).toContain(PORTAL_LOAD_ERROR_MESSAGE);
    expect(container.textContent).toContain("Failed to fetch");
  });

  it("Error ではない値が投げられても原因を画面へ残す", async () => {
    // ここだけ fetch を直接差し替える。Error でない値が投げられる状況は HTTP の応答では
    // 作れず、MSW では再現できない。防御的な分岐そのものを行使するための例外。
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject("想定外")),
    );

    const container = createContainer();

    await mountPortal(container);

    expect(container.textContent).toContain("想定外");
  });
});

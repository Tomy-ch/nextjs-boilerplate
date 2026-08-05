// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DocsJson } from "../docs-json/docs-json";
import { PortalApp } from "./portal-app";

const docs: DocsJson = {
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
          subgroups: [
            {
              title: "Layer",
              items: [{ name: "ADR 0021", path: "./guides/0021.md", lang: "all" }],
            },
          ],
        },
      ],
    },
    {
      title: "Get Started",
      slug: "get-started",
      sections: [
        {
          id: "setup",
          slug: "setup",
          title: "Setup",
          items: [{ name: "Setup", path: "./guides/setup.md", lang: "all" }],
        },
      ],
    },
  ],
  referenceLinks: [{ sectionId: "coverage", title: "Coverage", path: "./coverage/index.html" }],
};

function setHash(hash: string) {
  window.location.hash = hash;
}

beforeEach(() => {
  setHash("");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("PortalApp", () => {
  it("題と副題を見出しとして示す", () => {
    render(<PortalApp docs={docs} />);

    expect(screen.getByRole("heading", { level: 1, name: "Documentation" })).toBeInTheDocument();
    expect(screen.getByText("boilerplate")).toBeInTheDocument();
  });

  it("位置ハッシュが未指定なら先頭の group を表示する", () => {
    render(<PortalApp docs={docs} />);

    expect(screen.getByRole("heading", { level: 2, name: "Architecture" })).toBeInTheDocument();
  });

  it("位置ハッシュが指す group を表示する", () => {
    setHash("#/get-started");

    render(<PortalApp docs={docs} />);

    expect(screen.getByRole("heading", { level: 2, name: "Get Started" })).toBeInTheDocument();
  });

  it("位置ハッシュの変化に追従して表示する group を切り替える", async () => {
    render(<PortalApp docs={docs} />);

    act(() => {
      setHash("#/get-started");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(
      await screen.findByRole("heading", { level: 2, name: "Get Started" }),
    ).toBeInTheDocument();
  });

  it("section の項目と subgroup の項目をどちらも並べる", () => {
    render(<PortalApp docs={docs} />);

    expect(screen.getByRole("button", { name: "ADR 0001" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ADR 0021" })).toBeInTheDocument();
  });

  it("表示できる group が無ければその旨を示す", () => {
    render(<PortalApp docs={{ ...docs, groups: [] }} />);

    expect(screen.getByText("表示できる項目がありません。")).toBeInTheDocument();
  });

  it("表示言語を切り替えると絞り込みが変わる", async () => {
    const bilingual: DocsJson = {
      ...docs,
      groups: [
        {
          title: "Architecture",
          slug: "architecture",
          sections: [
            {
              id: "adr",
              slug: "adr",
              title: "ADR",
              items: [
                { name: "ADR (EN)", path: "./guides/adr.md", lang: "en" },
                { name: "ADR (JA)", path: "./guides/adr.ja.md", lang: "ja" },
              ],
            },
          ],
        },
      ],
    };

    render(<PortalApp docs={bilingual} />);
    expect(screen.getByRole("button", { name: "ADR (EN)" })).toBeInTheDocument();

    screen.getByRole("radio", { name: "JA" }).click();

    expect(await screen.findByRole("button", { name: "ADR (JA)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ADR (EN)" })).not.toBeInTheDocument();
  });

  it("表示言語を戻すと元の絞り込みに戻る", async () => {
    const bilingual: DocsJson = {
      ...docs,
      groups: [
        {
          title: "Architecture",
          slug: "architecture",
          sections: [
            {
              id: "adr",
              slug: "adr",
              title: "ADR",
              items: [
                { name: "ADR (EN)", path: "./guides/adr.md", lang: "en" },
                { name: "ADR (JA)", path: "./guides/adr.ja.md", lang: "ja" },
              ],
            },
          ],
        },
      ],
    };

    render(<PortalApp docs={bilingual} />);
    screen.getByRole("radio", { name: "JA" }).click();
    expect(await screen.findByRole("button", { name: "ADR (JA)" })).toBeInTheDocument();

    screen.getByRole("radio", { name: "EN" }).click();

    expect(await screen.findByRole("button", { name: "ADR (EN)" })).toBeInTheDocument();
  });

  it("検索語に一致した項目を結果として並べる", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<PortalApp docs={docs} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "ドキュメントを検索" }), {
      target: { value: "Setup" },
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(await screen.findByRole("heading", { name: /検索結果/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Setup" })).toBeInTheDocument();
  });

  it("検索語に一致しなければその旨を示す", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<PortalApp docs={docs} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "ドキュメントを検索" }), {
      target: { value: "該当しない語" },
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(await screen.findByText("一致する項目がありません。")).toBeInTheDocument();
  });

  it("常設リンクをサイドバーに置く", () => {
    render(<PortalApp docs={docs} />);

    expect(screen.getByRole("link", { name: "Coverage" })).toHaveAttribute(
      "href",
      "./coverage/index.html",
    );
  });

  it("文書を開くと題を先に示し、取得後に本文を描画する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve("## 節\n\n本文\n") })),
    );

    render(<PortalApp docs={docs} />);
    screen.getByRole("button", { name: "ADR 0001" }).click();

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "節" })).toBeInTheDocument();
  });

  it("文書の取得に失敗したら面を開いたままにしない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 404 })),
    );

    render(<PortalApp docs={docs} />);
    screen.getByRole("button", { name: "ADR 0001" }).click();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("面を閉じると開いていた文書を捨てる", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve("本文") })),
    );

    render(<PortalApp docs={docs} />);
    screen.getByRole("button", { name: "ADR 0001" }).click();

    const dialog = await screen.findByRole("dialog");

    screen.getByRole("button", { name: "閉じる" }).click();

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });
});

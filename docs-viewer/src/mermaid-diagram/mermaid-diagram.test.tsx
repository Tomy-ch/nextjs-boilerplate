// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { MermaidDiagram } from "./mermaid-diagram";

const initialize = vi.fn<(options: { theme: string }) => void>();
const run = vi.fn<(options: { nodes: readonly Element[] }) => Promise<void>>();

vi.mock("mermaid", () => ({
  default: { initialize: (o: never) => initialize(o), run: (o: never) => run(o) },
}));

const SOURCE = "flowchart TD\n  A[入力] --> B[出力]";

/** 器を返す。原文は改行を含むため、文字列ではなく slot で引く。 */
function renderDiagram(): HTMLElement {
  const { container } = render(<MermaidDiagram source={SOURCE} />);
  const diagram = container.querySelector<HTMLElement>('[data-slot="mermaid-diagram"]');

  if (diagram === null) {
    throw new Error("器が描かれていません");
  }

  return diagram;
}

describe("MermaidDiagram", () => {
  beforeEach(() => {
    initialize.mockClear();
    run.mockClear();
    run.mockResolvedValue(undefined);
    vi.unstubAllGlobals();
  });

  it("描き終わるまで原文を見せる", () => {
    run.mockReturnValue(new Promise(() => undefined));

    const diagram = renderDiagram();

    expect(diagram).toHaveAttribute("data-state", "source");
    expect(diagram).toHaveTextContent("A[入力] --> B[出力]");
  });

  it("自分の器を mermaid へ渡して描かせる", async () => {
    const diagram = renderDiagram();

    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));

    const [options] = run.mock.calls[0] ?? [];

    expect(options?.nodes[0]).toBe(diagram);
    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it("暗い面では暗い配色を選ぶ", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("dark") }));

    renderDiagram();

    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));

    expect(initialize.mock.calls[0]?.[0]?.theme).toBe("dark");
  });

  it("明るい面では明るい配色を選ぶ", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));

    renderDiagram();

    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));

    expect(initialize.mock.calls[0]?.[0]?.theme).toBe("default");
  });

  it("描き終わったことを状態として示す", async () => {
    const diagram = renderDiagram();

    await waitFor(() => expect(diagram).toHaveAttribute("data-state", "rendered"));
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<MermaidDiagram source={SOURCE} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("描けなかった場合は原文を残す", async () => {
    run.mockRejectedValue(new Error("描画できません"));

    const diagram = renderDiagram();

    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));

    expect(diagram).toHaveAttribute("data-state", "source");
    expect(diagram).toHaveTextContent("A[入力] --> B[出力]");
  });
});

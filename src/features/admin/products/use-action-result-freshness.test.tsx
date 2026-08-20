// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useActionResultFreshness } from "./use-action-result-freshness";

/**
 * 描画ごとの `resultIsNew` を記録する。
 *
 * @remarks
 * この合図は**描画のあいだだけ真**になり、落ち着いたあとは偽へ戻ります（入れ替わりを見た時点で
 * 覚え直すため）。落ち着いたあとの値を見ると、どの経路でも偽なので何も判りません。
 */
function Probe({ state, seen }: { state: string; seen: boolean[] }) {
  const freshness = useActionResultFreshness(state);

  seen.push(freshness.resultIsNew);

  return (
    <button onClick={freshness.dismiss} type="button">
      {freshness.dismissed ? "下げた" : "出ている"}
    </button>
  );
}

describe("useActionResultFreshness", () => {
  it("最初の結果は、入れ替わったとは見なさない", () => {
    const seen: boolean[] = [];

    render(<Probe seen={seen} state="first" />);

    expect(seen).not.toContain(true);
  });

  it("結果が入れ替わった描画でだけ、入れ替わったと示す", () => {
    const seen: boolean[] = [];
    const { rerender } = render(<Probe seen={seen} state="first" />);

    seen.length = 0;
    rerender(<Probe seen={seen} state="second" />);

    expect(seen).toContain(true);
  });

  it("同じ結果のまま描き直しても、入れ替わったとは見なさない", () => {
    const seen: boolean[] = [];
    const { rerender } = render(<Probe seen={seen} state="first" />);

    seen.length = 0;
    rerender(<Probe seen={seen} state="first" />);

    expect(seen).not.toContain(true);
  });

  it("下げた印を覚える", () => {
    render(<Probe seen={[]} state="first" />);

    act(() => screen.getByRole("button").click());

    expect(screen.getByRole("button")).toHaveTextContent("下げた");
  });

  it("結果が入れ替わったら、下げた印を戻す。押しても何も起きない画面にしないため", () => {
    const { rerender } = render(<Probe seen={[]} state="first" />);

    act(() => screen.getByRole("button").click());
    expect(screen.getByRole("button")).toHaveTextContent("下げた");

    rerender(<Probe seen={[]} state="second" />);

    expect(screen.getByRole("button")).toHaveTextContent("出ている");
  });
});

// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { LoadingAnnouncement, LoadingAnnouncerProvider } from "./loading-announcer";
import { ANNOUNCE_LOADING_AFTER_MS, LOADING_ANNOUNCEMENT } from "./loading-announcer.definition";

function treeWith(leaves: number) {
  return (
    <LoadingAnnouncerProvider>
      {Array.from({ length: leaves }, (_, index) => index).map((index) => (
        <LoadingAnnouncement key={index} />
      ))}
    </LoadingAnnouncerProvider>
  );
}

function passTheWait() {
  act(() => {
    vi.advanceTimersByTime(ANNOUNCE_LOADING_AFTER_MS);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("LoadingAnnouncerProvider", () => {
  // ----- 読み込んでいないとき -----
  it("読み込みが無くても、告げる領域を空のまま先に置く", () => {
    render(treeWith(0));

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("a11y 自動検査に違反しない", async () => {
    vi.useRealTimers();

    const { container } = render(treeWith(0));

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 読み込んでいるとき -----
  it("待ち時間を超えるまでは告げない", () => {
    render(treeWith(1));

    act(() => {
      vi.advanceTimersByTime(ANNOUNCE_LOADING_AFTER_MS - 1);
    });

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("待ち時間を超えたら、読み込み中だと告げる", () => {
    render(treeWith(1));
    passTheWait();

    expect(screen.getByRole("status")).toHaveTextContent(LOADING_ANNOUNCEMENT.LOADING);
  });

  it("いくつ読み込んでいても、告げる領域と文言は 1 つにする", () => {
    render(treeWith(3));
    passTheWait();

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(LOADING_ANNOUNCEMENT.LOADING);
  });

  it("開発時に効果が二重に回っても、読み込みは 1 つとして数える", () => {
    const { rerender } = render(<StrictMode>{treeWith(1)}</StrictMode>);

    passTheWait();
    rerender(<StrictMode>{treeWith(0)}</StrictMode>);

    expect(screen.getByRole("status")).toHaveTextContent(LOADING_ANNOUNCEMENT.LOADED);
  });

  // ----- 読み込み終えたとき -----
  it("告げた読み込みが終わったら、終わったことを告げる", () => {
    const { rerender } = render(treeWith(1));

    passTheWait();
    rerender(treeWith(0));

    expect(screen.getByRole("status")).toHaveTextContent(LOADING_ANNOUNCEMENT.LOADED);
  });

  it("待ち時間の内に終わった読み込みは、始まりも終わりも告げない", () => {
    const { rerender } = render(treeWith(1));

    rerender(treeWith(0));
    passTheWait();

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("いくつもの読み込みがすべて待ち時間の内に終わったら、待ち時間を過ぎても告げない", () => {
    const { rerender } = render(treeWith(2));

    rerender(treeWith(0));
    passTheWait();

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("読み込みが 1 つでも残っていれば、終わったとは告げない", () => {
    const { rerender } = render(treeWith(2));

    passTheWait();
    rerender(treeWith(1));

    expect(screen.getByRole("status")).toHaveTextContent(LOADING_ANNOUNCEMENT.LOADING);
  });
});

describe("LoadingAnnouncement", () => {
  it("何も描かない", () => {
    render(
      <LoadingAnnouncerProvider>
        <section aria-label="待機表示">
          <LoadingAnnouncement />
        </section>
      </LoadingAnnouncerProvider>,
    );

    expect(screen.getByRole("region", { name: "待機表示" })).toBeEmptyDOMElement();
  });

  it("告げる領域の外に置かれたら、何もしない", () => {
    const { container } = render(<LoadingAnnouncement />);

    passTheWait();

    expect(container).toBeEmptyDOMElement();
  });
});

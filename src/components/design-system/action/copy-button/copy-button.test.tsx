// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { COPY_FEEDBACK_MS, CopyButton } from "./copy-button";

const writeText = vi.fn<(value: string) => Promise<void>>();

beforeEach(() => {
  vi.useFakeTimers();
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/**
 * 写す操作を押す。
 *
 * @remarks
 * **ここは `user-event` を使いません。**合図が一定時間で消えることを確かめるには偽の時計が要り、
 * `user-event` は入力の再現に自前の待ち合わせを挟むため、その下では止まったままになります。
 */
async function clickCopy() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "識別子を写す" }));
  });
}

describe("CopyButton", () => {
  it("アイコンだけの操作にアクセシブルな名前を与える", () => {
    render(<CopyButton label="識別子を写す" value="abc" />);

    expect(screen.getByRole("button", { name: "識別子を写す" })).toHaveAttribute("type", "button");
  });

  it("押すと指定された文字列を clipboard へ写す", async () => {
    render(<CopyButton label="識別子を写す" value="abc" />);

    await clickCopy();

    expect(writeText).toHaveBeenCalledExactlyOnceWith("abc");
  });

  it("写した後は合図を読み上げ、一定時間で消す", async () => {
    render(<CopyButton label="識別子を写す" value="abc" />);

    await clickCopy();

    expect(screen.getByText("写しました")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(COPY_FEEDBACK_MS);
    });

    expect(screen.queryByText("写しました")).not.toBeInTheDocument();
  });

  it("合図の文言を呼び出し元が変えられる", async () => {
    render(<CopyButton copiedLabel="コピー済み" label="識別子を写す" value="abc" />);

    await clickCopy();

    expect(screen.getByText("コピー済み")).toBeInTheDocument();
  });

  it("clipboard が使えない場合は例外を投げず、合図も出さない", async () => {
    writeText.mockRejectedValue(new Error("拒否されました"));
    render(<CopyButton label="識別子を写す" value="abc" />);

    await clickCopy();

    expect(screen.queryByText("写しました")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    vi.useRealTimers();

    const { container } = render(<CopyButton label="識別子を写す" value="abc" />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

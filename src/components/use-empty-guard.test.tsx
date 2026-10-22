// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ChangeEvent, useCallback, useId, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { useEmptyGuard } from "./use-empty-guard";

const MESSAGE = "入力してください。";

function GuardedForm({ action }: { action: (formData: FormData) => void }) {
  const id = useId();
  const [value, setValue] = useState("");
  const { error, clear, refuseEmpty } = useEmptyGuard(value, MESSAGE);
  const keepValue = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
      clear();
    },
    [clear],
  );

  return (
    <form action={action} onSubmit={refuseEmpty}>
      <label htmlFor={id}>メモ</label>
      <input id={id} name="note" onChange={keepValue} value={value} />
      {error === null ? null : <p>{error}</p>}
      <button type="submit">送る</button>
    </form>
  );
}

describe("useEmptyGuard", () => {
  // ----- 正常系 -----
  it("まだ送っていなければ、文言を出さない", () => {
    render(<GuardedForm action={vi.fn()} />);

    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it("入力があれば送信を止めず、文言も出さない", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(<GuardedForm action={action} />);
    await user.type(screen.getByLabelText("メモ"), "本文");
    await user.click(screen.getByRole("button", { name: "送る" }));

    expect(action).toHaveBeenCalledOnce();
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it("文言を出した後に入力し直して押せば、送る", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(<GuardedForm action={action} />);
    await user.click(screen.getByRole("button", { name: "送る" }));
    await user.type(screen.getByLabelText("メモ"), "本文");
    await user.click(screen.getByRole("button", { name: "送る" }));

    expect(action).toHaveBeenCalledOnce();
  });

  it("消せば、出していた文言を外す", async () => {
    const user = userEvent.setup();

    render(<GuardedForm action={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "送る" }));
    await user.type(screen.getByLabelText("メモ"), "本");

    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  // ----- 異常系 -----
  it.each([
    ["空", ""],
    ["空白だけ", "   "],
  ])("入力が%sなら送信を止め、渡した文言を出す", async (_label, value) => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(<GuardedForm action={action} />);
    if (value !== "") {
      await user.type(screen.getByLabelText("メモ"), value);
    }
    await user.click(screen.getByRole("button", { name: "送る" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByText(MESSAGE)).toBeVisible();
  });
});

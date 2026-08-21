// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ProductTextField } from "./text-field";

const noop = () => {};

function renderField(props: Partial<Parameters<typeof ProductTextField>[0]> = {}) {
  return render(
    <ProductTextField
      controlId="form-name"
      label="商品名"
      name="name"
      onLeave={noop}
      onValueChange={noop}
      required={true}
      value=""
      {...props}
    />,
  );
}

describe("ProductTextField", () => {
  it("項目名で引ける入力欄として公開する", () => {
    renderField();

    expect(screen.getByLabelText("商品名")).toBeInTheDocument();
  });

  it("値は呼び出し元が持つ。送信のあとに入力欄が元へ戻らないため", () => {
    renderField({ value: "ワイヤレスイヤホン" });

    expect(screen.getByLabelText("商品名")).toHaveValue("ワイヤレスイヤホン");
  });

  it("打鍵のたびに新しい値を伝える", async () => {
    const onValueChange = vi.fn();
    renderField({ onValueChange });

    // 値は呼び出し元が持つため、打鍵しても入力欄は空のままである。1 打鍵で 1 度、その文字が
    // 伝わることを見る。
    await userEvent.type(screen.getByLabelText("商品名"), "あ");

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("あ");
  });

  it("focus が外れたことを伝える。誤りを出す合図になるため", async () => {
    const onLeave = vi.fn();
    renderField({ onLeave });

    await userEvent.click(screen.getByLabelText("商品名"));
    await userEvent.tab();

    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("送信時の名前を入力欄へ与える", () => {
    renderField();

    expect(screen.getByLabelText("商品名")).toHaveAttribute("name", "name");
  });

  it("誤りがあれば文言を出し、入力欄から指す", () => {
    renderField({ message: "商品名を入力してください。" });

    const input = screen.getByLabelText("商品名");

    expect(screen.getByText("商品名を入力してください。")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "form-name-error");
  });

  it("誤りが無いときも、検証していないことと区別できるようにする", () => {
    renderField();

    expect(screen.getByLabelText("商品名")).toHaveAttribute("aria-invalid", "false");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderField({ message: "商品名を入力してください。" });

    expect((await axe(container)).violations).toEqual([]);
  });
});

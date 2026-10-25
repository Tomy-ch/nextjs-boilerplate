// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { failedActionState, idleActionState, succeededActionState } from "@/model/action-state";

import { INQUIRY_BODY_FIELD } from "../../../form-names";
import { InquiryComposer } from "./composer";

const KEY = "00000000-0000-4000-8000-000000000001";

function renderComposer(overrides: Partial<Parameters<typeof InquiryComposer>[0]> = {}) {
  const props = {
    action: vi.fn(),
    idempotencyKey: KEY,
    outcomeOpen: false,
    pending: false,
    state: idleActionState<void, typeof INQUIRY_BODY_FIELD>(),
    ...overrides,
  };

  return { ...render(<InquiryComposer {...props} />), props };
}

describe("InquiryComposer", () => {
  // ----- まだ書いていないとき -----
  it("本文の入力欄に名前を与える", () => {
    renderComposer();

    expect(screen.getByLabelText("お問い合わせ内容")).toBeInTheDocument();
  });

  it("契約の上限を入力欄へ渡す", () => {
    renderComposer();

    expect(screen.getByLabelText("お問い合わせ内容")).toHaveAttribute("maxLength", "4000");
  });

  it("冪等キーを送信に載せる", () => {
    const { container } = renderComposer();

    expect(container.querySelector('input[name="idempotencyKey"]')).toHaveValue(KEY);
  });

  it("空でも送信の操作は押せる", () => {
    renderComposer();

    expect(screen.getByRole("button", { name: "送信" })).toBeEnabled();
  });

  it("本文が必須であることを入力欄が伝える", () => {
    renderComposer();

    expect(screen.getByLabelText("お問い合わせ内容")).toHaveAttribute("aria-required", "true");
  });

  it.each([
    ["空", ""],
    ["空白だけ", "   "],
  ])("%sのまま押したら送らず、入力を促す文言を欄に紐づけて出す", async (_label, body) => {
    const user = userEvent.setup();
    const { props } = renderComposer();
    const textarea = screen.getByLabelText("お問い合わせ内容");

    if (body !== "") {
      await user.type(textarea, body);
    }
    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(props.action).not.toHaveBeenCalled();
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAccessibleDescription("本文を入力してください。");
  });

  it("空のまま修飾キーつきの Enter を押しても送らず、入力を促す", async () => {
    const { props } = renderComposer();
    const textarea = screen.getByLabelText("お問い合わせ内容");

    await userEvent.type(textarea, "{Meta>}{Enter}{/Meta}");

    expect(props.action).not.toHaveBeenCalled();
    expect(textarea).toHaveAccessibleDescription("本文を入力してください。");
  });

  it("空のまま押した後に書き始めると、入力を促す文言を消す", async () => {
    const user = userEvent.setup();

    renderComposer();
    await user.click(screen.getByRole("button", { name: "送信" }));
    await user.type(screen.getByLabelText("お問い合わせ内容"), "本");

    expect(screen.queryByText("本文を入力してください。")).not.toBeInTheDocument();
  });

  it("項目エラーが無ければ、入力欄に不正の印を付けない", () => {
    renderComposer();

    expect(screen.getByLabelText("お問い合わせ内容")).not.toHaveAttribute("aria-invalid");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderComposer();

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 書きかけがあるとき -----
  it("本文があれば、押したら送り、入力を促す文言は出さない", async () => {
    const { props } = renderComposer();

    await userEvent.type(screen.getByLabelText("お問い合わせ内容"), "本文");
    await userEvent.click(screen.getByRole("button", { name: "送信" }));

    expect(props.action).toHaveBeenCalledOnce();
    expect(screen.queryByText("本文を入力してください。")).not.toBeInTheDocument();
  });

  it.each([["Meta"], ["Control"]])("修飾キー（%s）つきの Enter で送信する", async (modifier) => {
    renderComposer();

    const textarea = screen.getByLabelText("お問い合わせ内容");
    const submit = vi.fn((event: SubmitEvent) => event.preventDefault());

    textarea.closest("form")?.addEventListener("submit", submit);
    await userEvent.type(textarea, "本文");
    await userEvent.type(textarea, `{${modifier}>}{Enter}{/${modifier}}`);

    expect(submit).toHaveBeenCalledOnce();
  });

  // user-event は変換中の打鍵を作れないため、ここだけ fireEvent で状態つきの keydown を渡す。
  it.each([
    ["変換中", { isComposing: true }],
    ["Safari の変換確定", { keyCode: 229 }],
  ])("%sの修飾キーつき Enter では送らない", async (_label, init) => {
    renderComposer();

    const textarea = screen.getByLabelText("お問い合わせ内容");
    const submit = vi.fn((event: SubmitEvent) => event.preventDefault());

    textarea.closest("form")?.addEventListener("submit", submit);
    await userEvent.type(textarea, "本文");
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true, ...init });

    expect(submit).not.toHaveBeenCalled();
  });

  it("送信中は修飾キーつき Enter でも送らない", async () => {
    renderComposer({ pending: true });

    const textarea = screen.getByLabelText("お問い合わせ内容");
    const submit = vi.fn((event: SubmitEvent) => event.preventDefault());

    textarea.closest("form")?.addEventListener("submit", submit);
    await userEvent.type(textarea, "本文");
    await userEvent.type(textarea, "{Control>}{Enter}{/Control}");

    expect(submit).not.toHaveBeenCalled();
  });

  it("修飾キーの無い Enter では送らない", async () => {
    renderComposer();

    const textarea = screen.getByLabelText("お問い合わせ内容");
    const submit = vi.fn((event: SubmitEvent) => event.preventDefault());

    textarea.closest("form")?.addEventListener("submit", submit);
    await userEvent.type(textarea, "本文{Enter}");

    expect(submit).not.toHaveBeenCalled();
  });

  // ----- 送っているとき -----
  it("送信中は二重に送れない", () => {
    renderComposer({ pending: true });

    expect(screen.getByRole("button", { name: "送信中" })).toBeDisabled();
  });

  // ----- 送り終えたとき -----
  it("成立したら書きかけを片付ける", () => {
    const { rerender } = renderComposer();
    const textarea = screen.getByLabelText("お問い合わせ内容");

    rerender(
      <InquiryComposer
        action={vi.fn()}
        idempotencyKey={KEY}
        outcomeOpen={false}
        pending={false}
        state={succeededActionState<void, typeof INQUIRY_BODY_FIELD>(undefined)}
      />,
    );

    expect(textarea).toHaveValue("");
  });

  // ----- 送れなかったとき -----
  it("通らなかった送信では書きかけを残す", async () => {
    const { rerender } = renderComposer();
    const textarea = screen.getByLabelText("お問い合わせ内容");

    await userEvent.type(textarea, "打ち直したくない本文");
    rerender(
      <InquiryComposer
        action={vi.fn()}
        idempotencyKey={KEY}
        outcomeOpen={false}
        pending={false}
        state={failedActionState<void, typeof INQUIRY_BODY_FIELD>({ formError: "失敗" })}
      />,
    );

    expect(textarea).toHaveValue("打ち直したくない本文");
    // 項目に紐づかない失敗なので、入力欄そのものへ不正の印は付かない。
    expect(textarea).not.toHaveAttribute("aria-invalid");
  });

  it("結果が定まらないあいだは本文を書き換えさせず、理由を欄に結ぶ", async () => {
    const { rerender } = renderComposer();
    const textarea = screen.getByLabelText("お問い合わせ内容");

    await userEvent.type(textarea, "送った本文");
    rerender(
      <InquiryComposer
        action={vi.fn()}
        idempotencyKey={KEY}
        outcomeOpen={true}
        pending={false}
        state={failedActionState<void, typeof INQUIRY_BODY_FIELD>({ formError: "失敗" })}
      />,
    );
    await userEvent.type(textarea, "を書き換える");

    expect(textarea).toHaveValue("送った本文");
    expect(textarea).toHaveAccessibleDescription(
      "前回の送信の結果が分かるまで、本文は書き換えられません。同じ本文でもう一度送信してください。",
    );
  });

  it("結果が定まったら、また書き換えられる", async () => {
    const { rerender } = renderComposer();
    const textarea = screen.getByLabelText("お問い合わせ内容");

    rerender(
      <InquiryComposer
        action={vi.fn()}
        idempotencyKey={KEY}
        outcomeOpen={true}
        pending={false}
        state={failedActionState<void, typeof INQUIRY_BODY_FIELD>({ formError: "失敗" })}
      />,
    );
    rerender(
      <InquiryComposer
        action={vi.fn()}
        idempotencyKey={KEY}
        outcomeOpen={false}
        pending={false}
        state={failedActionState<void, typeof INQUIRY_BODY_FIELD>({ formError: "失敗" })}
      />,
    );
    await userEvent.type(textarea, "本文");

    expect(textarea).toHaveValue("本文");
    expect(
      screen.queryByText(
        "前回の送信の結果が分かるまで、本文は書き換えられません。同じ本文でもう一度送信してください。",
      ),
    ).not.toBeInTheDocument();
  });

  it("本文の項目エラーを入力欄へ紐づける", () => {
    renderComposer({
      state: failedActionState<void, typeof INQUIRY_BODY_FIELD>({
        fieldErrors: { [INQUIRY_BODY_FIELD]: ["本文を入力してください。"] },
      }),
    });

    const textarea = screen.getByLabelText("お問い合わせ内容");

    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("本文を入力してください。")).toBeVisible();
  });
});

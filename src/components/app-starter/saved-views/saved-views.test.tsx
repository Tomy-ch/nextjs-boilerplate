// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { SavedViews } from "./saved-views";

beforeAll(() => {
  // Radix の menu と dialog は位置計算に使う API を jsdom が持たないため、実装を変えずにここで補う。
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const VIEWS = [
  { id: "recent", name: "最近更新した順" },
  { id: "mine", name: "自分の担当" },
];

function renderSavedViews(overrides: Partial<Parameters<typeof SavedViews>[0]> = {}) {
  const props = {
    views: VIEWS,
    currentViewId: "mine",
    onSelect: vi.fn(),
    onCreate: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  const { rerender } = render(<SavedViews {...props} />);

  return {
    ...props,
    update: (next: Partial<Parameters<typeof SavedViews>[0]>) =>
      rerender(<SavedViews {...props} {...next} />),
  };
}

function nameForm() {
  return within(screen.getByRole("dialog")).getByRole("textbox", { name: "名前" }).closest("form");
}

function openMenu(name: string) {
  // Radix の trigger は click ではなく pointerdown で開閉する。
  fireEvent.pointerDown(screen.getByRole("button", { name }), { button: 0, ctrlKey: false });

  return screen.getByRole("menu");
}

function openItem(menuItemName: string, triggerName = "自分の担当") {
  fireEvent.click(within(openMenu(triggerName)).getByRole("menuitem", { name: menuItemName }));
}

describe("SavedViews", () => {
  it("選択中の条件の名前を trigger に出す", () => {
    renderSavedViews();

    expect(screen.getByRole("button", { name: "自分の担当" })).toBeInTheDocument();
  });

  it("条件を当てていないときは操作の名前を trigger に出す", () => {
    renderSavedViews({ currentViewId: null });

    expect(screen.getByRole("button", { name: "保存した条件" })).toBeInTheDocument();
  });

  it("操作の名前を呼び出し元が差し替えられる", () => {
    renderSavedViews({ currentViewId: null, label: "表示する条件" });

    expect(screen.getByRole("button", { name: "表示する条件" })).toBeInTheDocument();
  });

  it("保存した条件を選択肢として並べ、いま当てているものを選択済みにする", () => {
    renderSavedViews();

    const menu = openMenu("自分の担当");

    expect(within(menu).getByRole("menuitemradio", { name: "自分の担当" })).toBeChecked();
    expect(within(menu).getByRole("menuitemradio", { name: "最近更新した順" })).not.toBeChecked();
  });

  it("条件を選んだことを呼び出し元へ返す", () => {
    const { onSelect } = renderSavedViews();

    fireEvent.click(
      within(openMenu("自分の担当")).getByRole("menuitemradio", { name: "最近更新した順" }),
    );

    expect(onSelect).toHaveBeenCalledWith("recent");
  });

  it("保存した条件が無いときは選択肢を出さず、その旨を示す", () => {
    renderSavedViews({ currentViewId: null, views: [] });

    const menu = openMenu("保存した条件");

    expect(within(menu).queryAllByRole("menuitemradio")).toHaveLength(0);
    expect(
      within(menu).getByRole("menuitem", { name: "保存した条件はありません" }),
    ).toHaveAttribute("data-disabled");
  });

  it("条件を当てていない間は名前の変更と削除を選ばせない", () => {
    renderSavedViews({ currentViewId: null });

    const menu = openMenu("保存した条件");

    expect(within(menu).getByRole("menuitem", { name: "名前を変更" })).toHaveAttribute(
      "data-disabled",
    );
    expect(within(menu).getByRole("menuitem", { name: "削除" })).toHaveAttribute("data-disabled");
    expect(within(menu).getByRole("menuitem", { name: "現在の条件を保存" })).not.toHaveAttribute(
      "data-disabled",
    );
  });

  it("いまの条件へ名前を付けて保存したことを呼び出し元へ返す", () => {
    const { onCreate } = renderSavedViews();

    openItem("現在の条件を保存");
    fireEvent.change(screen.getByRole("textbox", { name: "名前" }), {
      target: { value: "未対応だけ" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onCreate).toHaveBeenCalledWith("未対応だけ");
  });

  it("名前の前後の空白は落として渡す", () => {
    const { onCreate } = renderSavedViews();

    openItem("現在の条件を保存");
    fireEvent.change(screen.getByRole("textbox", { name: "名前" }), {
      target: { value: "  未対応だけ  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onCreate).toHaveBeenCalledWith("未対応だけ");
  });

  it("空白だけの名前では保存させない", () => {
    const { onCreate } = renderSavedViews();

    openItem("現在の条件を保存");
    fireEvent.change(screen.getByRole("textbox", { name: "名前" }), { target: { value: "   " } });

    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("form から直接送信されても空白だけの名前は保存しない", () => {
    const { onCreate } = renderSavedViews();

    openItem("現在の条件を保存");
    fireEvent.change(screen.getByRole("textbox", { name: "名前" }), { target: { value: "  " } });
    fireEvent.submit(nameForm() ?? document.createElement("form"));

    expect(onCreate).not.toHaveBeenCalled();
  });

  it("入力の途中で対象の条件が消えたときは名前を変えない", () => {
    const { onRename, update } = renderSavedViews();

    openItem("名前を変更");
    update({ currentViewId: null, views: [VIEWS[0]] });
    fireEvent.change(screen.getByRole("textbox", { name: "名前" }), { target: { value: "別名" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("確認の途中で対象の条件が消えたときは削除しない", () => {
    const { onDelete, update } = renderSavedViews();

    openItem("削除");
    update({ currentViewId: null, views: [VIEWS[0]] });
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "削除" }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("既定では条件を当てていない扱いにする", () => {
    render(
      <SavedViews
        onCreate={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
        onSelect={vi.fn()}
        views={VIEWS}
      />,
    );

    expect(screen.getByRole("button", { name: "保存した条件" })).toBeInTheDocument();
  });

  it("名前の変更では選択中の条件の名前を初期値にする", () => {
    renderSavedViews();

    openItem("名前を変更");

    expect(screen.getByRole("textbox", { name: "名前" })).toHaveValue("自分の担当");
  });

  it("名前を変えたことを、対象の条件とともに呼び出し元へ返す", () => {
    const { onRename } = renderSavedViews();

    openItem("名前を変更");
    fireEvent.change(screen.getByRole("textbox", { name: "名前" }), {
      target: { value: "自分の担当（今週）" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onRename).toHaveBeenCalledWith("mine", "自分の担当（今週）");
  });

  it("入力の dialog は名前を説明とともに示す", () => {
    renderSavedViews();

    openItem("名前を変更");

    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveAccessibleName("条件の名前を変更");
    expect(dialog).toHaveAccessibleDescription(
      "一覧に出す名前を書き換えます。条件そのものは変わりません。",
    );
  });

  it("削除は取り消せない操作として確認を挟む", () => {
    renderSavedViews();

    openItem("削除");

    const dialog = screen.getByRole("alertdialog");

    expect(dialog).toHaveAccessibleName("条件を削除");
    expect(dialog).toHaveAccessibleDescription("「自分の担当」を削除します。取り消せません。");
  });

  it("確認したときだけ削除を呼び出し元へ返す", () => {
    const { onDelete } = renderSavedViews();

    openItem("削除");
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "削除" }));

    expect(onDelete).toHaveBeenCalledWith("mine");
  });

  it("確認をやめたときは削除しない", () => {
    const { onDelete } = renderSavedViews();

    openItem("削除");
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "キャンセル" }),
    );

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("入力をやめたときは保存しない", () => {
    const { onRename } = renderSavedViews();

    openItem("名前を変更");
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "キャンセル" }));

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { baseElement } = render(
      <SavedViews
        currentViewId="mine"
        onCreate={vi.fn()}
        onDelete={vi.fn()}
        onRename={vi.fn()}
        onSelect={vi.fn()}
        views={VIEWS}
      />,
    );

    openMenu("自分の担当");

    const result = await axe(baseElement, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });
});

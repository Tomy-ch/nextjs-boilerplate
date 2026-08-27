// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import type { AdminProductFilterOption } from "../../filter-option";
import type { AdminProductListConditions } from "../../query";
import { AdminProductFilterSheet } from "./filter-sheet";

beforeAll(() => {
  // 候補を開く overlay が使う表示位置・寸法計測の API を jsdom が持たないため、ここで補う。
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const CATEGORIES: readonly AdminProductFilterOption[] = [
  { value: "1", label: "電子機器" },
  { value: "3", label: "書籍" },
];

const STATUSES: readonly AdminProductFilterOption[] = [{ value: "2", label: "在庫切れ" }];

const NO_CONDITIONS: AdminProductListConditions = {
  keyword: "",
  categoryCodes: [],
  statusCodes: [],
};

function renderSheet(conditions: AdminProductListConditions = NO_CONDITIONS) {
  return render(
    <AdminProductFilterSheet
      categoryOptions={CATEGORIES}
      conditions={conditions}
      statusOptions={STATUSES}
    />,
  );
}

function trigger(): HTMLElement {
  return screen.getByRole("button", { name: /絞り込み/ });
}

/** 候補は開かないと現れない。名前には選択の要約が続くため部分一致で探す。 */
async function openField(label: string): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: new RegExp(label) }));
}

async function open(conditions?: AdminProductListConditions) {
  renderSheet(conditions);
  await userEvent.click(trigger());
  await screen.findByRole("dialog");
}

describe("AdminProductFilterSheet", () => {
  beforeEach(() => {
    push.mockClear();
  });

  // ----- 閉じているとき -----
  it("開く操作だけを出す", () => {
    renderSheet();

    expect(screen.queryByRole("button", { name: /分類/ })).not.toBeInTheDocument();
  });

  it("効いている条件の数を操作に添える", () => {
    renderSheet({ ...NO_CONDITIONS, categoryCodes: ["1"], statusCodes: ["2"] });

    expect(screen.getByLabelText("2 件の条件が有効")).toBeInTheDocument();
  });

  it("同じ種類を複数選んだ分も数に含める", () => {
    renderSheet({ ...NO_CONDITIONS, categoryCodes: ["1", "3"], statusCodes: ["2"] });

    expect(screen.getByLabelText("3 件の条件が有効")).toBeInTheDocument();
  });

  it("何も効いていなければ数を出さない", () => {
    renderSheet();

    expect(screen.queryByLabelText(/件の条件が有効/)).not.toBeInTheDocument();
  });

  it("検索語は数に含めない", () => {
    renderSheet({ ...NO_CONDITIONS, keyword: "鞄" });

    expect(screen.queryByLabelText(/件の条件が有効/)).not.toBeInTheDocument();
  });

  // ----- 開いたとき -----
  it("分類と状態の入力欄を出す", async () => {
    await open();

    expect(screen.getByRole("button", { name: /分類/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /状態/ })).toBeInTheDocument();
  });

  it("いま効いている条件から組み直す", async () => {
    await open({ ...NO_CONDITIONS, categoryCodes: ["1"] });
    await openField("分類");

    expect(screen.getByRole("checkbox", { name: "電子機器" })).toBeChecked();
  });

  it("選んだ時点では反映しない", async () => {
    await open();
    await openField("分類");
    await userEvent.click(screen.getByRole("checkbox", { name: "電子機器" }));

    expect(push).not.toHaveBeenCalled();
  });

  it("確定すると組んだ条件で一覧へ移る", async () => {
    await open();
    await openField("分類");
    await userEvent.click(screen.getByRole("checkbox", { name: "電子機器" }));
    await userEvent.keyboard("{Escape}");
    await openField("状態");
    await userEvent.click(screen.getByRole("checkbox", { name: "在庫切れ" }));
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "この条件で見る" }));

    expect(push).toHaveBeenCalledWith("/admin/products?categoryCodes=1&statusCodes=2");
  });

  it("確定すると overlay を閉じる", async () => {
    await open();

    await userEvent.click(screen.getByRole("button", { name: "この条件で見る" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("検索語は確定の対象に含めたまま引き継ぐ", async () => {
    await open({ ...NO_CONDITIONS, keyword: "鞄" });

    await userEvent.click(screen.getByRole("button", { name: "この条件で見る" }));

    expect(push).toHaveBeenCalledWith("/admin/products?keyword=%E9%9E%84");
  });

  it("すべて外しても、外した時点では反映しない", async () => {
    await open({ ...NO_CONDITIONS, categoryCodes: ["1"] });

    await userEvent.click(screen.getByRole("button", { name: "条件をすべて外す" }));
    await openField("分類");

    expect(screen.getByRole("checkbox", { name: "電子機器" })).not.toBeChecked();
    expect(push).not.toHaveBeenCalled();
  });

  it("開き直すと選びかけを捨てる", async () => {
    renderSheet();

    await userEvent.click(trigger());
    await screen.findByRole("dialog");
    await openField("分類");
    await userEvent.click(screen.getByRole("checkbox", { name: "電子機器" }));
    await userEvent.keyboard("{Escape}");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(trigger());
    await screen.findByRole("dialog");
    await openField("分類");

    expect(screen.getByRole("checkbox", { name: "電子機器" })).not.toBeChecked();
  });
  it("閉じているときの a11y 検査を通る", async () => {
    const { container } = renderSheet();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("overlay を開いたときの a11y 検査を通る", async () => {
    const { container } = renderSheet();

    await userEvent.click(trigger());
    await screen.findByRole("dialog");

    expect(
      (await axe(container.ownerDocument.body, { rules: { "color-contrast": { enabled: false } } }))
        .violations,
    ).toEqual([]);
  });
});

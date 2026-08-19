// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import type { AdminProductFilterOption } from "../../filter-option";
import type { AdminProductListConditions } from "../../query";
import { AdminProductFilterSheet } from "./filter-sheet";

const CATEGORIES: readonly AdminProductFilterOption[] = [
  { value: "", label: "すべての分類" },
  { value: "1", label: "電子機器" },
];

const STATUSES: readonly AdminProductFilterOption[] = [
  { value: "", label: "すべての状態" },
  { value: "2", label: "在庫切れ" },
];

const NO_CONDITIONS: AdminProductListConditions = {
  keyword: "",
  categoryCode: "",
  statusCode: "",
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

    expect(screen.queryByLabelText("分類")).not.toBeInTheDocument();
  });

  it("効いている条件の数を操作に添える", () => {
    renderSheet({ ...NO_CONDITIONS, categoryCode: "1", statusCode: "2" });

    expect(screen.getByLabelText("2 件の条件が有効")).toBeInTheDocument();
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

    expect(screen.getByLabelText("分類")).toBeInTheDocument();
    expect(screen.getByLabelText("状態")).toBeInTheDocument();
  });

  it("いま効いている条件から組み直す", async () => {
    await open({ ...NO_CONDITIONS, categoryCode: "1" });

    expect(screen.getByLabelText("分類")).toHaveValue("1");
  });

  it("選んだ時点では反映しない", async () => {
    await open();

    await userEvent.selectOptions(screen.getByLabelText("分類"), "1");

    expect(push).not.toHaveBeenCalled();
  });

  it("確定すると組んだ条件で一覧へ移る", async () => {
    await open();

    await userEvent.selectOptions(screen.getByLabelText("分類"), "1");
    await userEvent.selectOptions(screen.getByLabelText("状態"), "2");
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
    await open({ ...NO_CONDITIONS, categoryCode: "1" });

    await userEvent.click(screen.getByRole("button", { name: "条件をすべて外す" }));

    expect(screen.getByLabelText("分類")).toHaveValue("");
    expect(push).not.toHaveBeenCalled();
  });

  it("開き直すと選びかけを捨てる", async () => {
    renderSheet();

    await userEvent.click(trigger());
    await userEvent.selectOptions(await screen.findByLabelText("分類"), "1");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(trigger());

    expect(await screen.findByLabelText("分類")).toHaveValue("");
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

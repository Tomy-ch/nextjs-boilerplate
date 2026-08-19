// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import type { AdminProductFilterOption } from "../../filter-option";
import type { AdminProductListConditions } from "../../query";
import { AdminProductFilterSelect } from "./filter-select";

const OPTIONS: readonly AdminProductFilterOption[] = [
  { value: "", label: "すべての分類" },
  { value: "1", label: "電子機器" },
];

const NO_CONDITIONS: AdminProductListConditions = {
  keyword: "",
  categoryCode: "",
  statusCode: "",
};

function renderSelect(conditions: AdminProductListConditions = NO_CONDITIONS) {
  return render(
    <AdminProductFilterSelect
      conditions={conditions}
      field="categoryCode"
      label="分類"
      options={OPTIONS}
    />,
  );
}

describe("AdminProductFilterSelect", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("選んだ時点で一覧の URL へ移る", async () => {
    renderSelect();

    await userEvent.selectOptions(screen.getByLabelText("分類"), "1");

    expect(push).toHaveBeenCalledWith("/admin/products?categoryCodes=1");
  });

  it("いま効いている他の条件を引き継ぐ", async () => {
    renderSelect({ ...NO_CONDITIONS, keyword: "鞄", statusCode: "2" });

    await userEvent.selectOptions(screen.getByLabelText("分類"), "1");

    expect(push).toHaveBeenCalledWith(
      "/admin/products?keyword=%E9%9E%84&categoryCodes=1&statusCodes=2",
    );
  });

  it("指定なしを選ぶとその条件だけが外れる", async () => {
    renderSelect({ ...NO_CONDITIONS, categoryCode: "1", statusCode: "2" });

    await userEvent.selectOptions(screen.getByLabelText("分類"), "");

    expect(push).toHaveBeenCalledWith("/admin/products?statusCodes=2");
  });

  it("いま効いている条件を選択に反映する", () => {
    renderSelect({ ...NO_CONDITIONS, categoryCode: "1" });

    expect(screen.getByLabelText("分類")).toHaveValue("1");
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderSelect();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

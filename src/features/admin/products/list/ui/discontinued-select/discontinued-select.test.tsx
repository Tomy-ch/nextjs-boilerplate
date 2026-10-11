// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { type AdminProductListConditions, DISCONTINUED_FILTER } from "../../query";
import { AdminProductDiscontinuedSelect } from "./discontinued-select";

const NO_CONDITIONS: AdminProductListConditions = {
  keyword: "",
  categoryCodes: [],
  statusCodes: [],
  discontinued: null,
};

function renderSelect(conditions: AdminProductListConditions = NO_CONDITIONS) {
  return render(<AdminProductDiscontinuedSelect conditions={conditions} />);
}

describe("AdminProductDiscontinuedSelect", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("選んだ時点で、その条件の一覧の URL へ移る", async () => {
    renderSelect();

    await userEvent.click(screen.getByRole("radio", { name: "廃番のみ" }));

    expect(push).toHaveBeenCalledWith("/admin/products?discontinued=true");
  });

  it("いま効いている他の条件を引き継ぐ", async () => {
    renderSelect({ ...NO_CONDITIONS, keyword: "鞄", statusCodes: ["2"] });

    await userEvent.click(screen.getByRole("radio", { name: "廃番を除く" }));

    expect(push).toHaveBeenCalledWith(
      "/admin/products?keyword=%E9%9E%84&statusCodes=2&discontinued=false",
    );
  });

  it("選び直すと、前の値を置き換える", async () => {
    renderSelect({ ...NO_CONDITIONS, discontinued: DISCONTINUED_FILTER.ONLY });

    await userEvent.click(screen.getByRole("radio", { name: "廃番を除く" }));

    expect(push).toHaveBeenCalledWith("/admin/products?discontinued=false");
  });

  it("いま効いている値を選択に反映する", () => {
    renderSelect({ ...NO_CONDITIONS, discontinued: DISCONTINUED_FILTER.ONLY });

    expect(screen.getByRole("radio", { name: "廃番のみ" })).toBeChecked();
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderSelect();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

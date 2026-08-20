// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import type { AdminProductFilterOption } from "../../filter-option";
import type { AdminProductListConditions } from "../../query";
import { AdminProductFilterSelect } from "./filter-select";

beforeAll(() => {
  // 候補を開く overlay が使う表示位置・寸法計測の API を jsdom が持たないため、ここで補う。
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const OPTIONS: readonly AdminProductFilterOption[] = [
  { value: "1", label: "電子機器" },
  { value: "2", label: "書籍" },
];

const NO_CONDITIONS: AdminProductListConditions = {
  keyword: "",
  categoryCodes: [],
  statusCodes: [],
};

function renderSelect(conditions: AdminProductListConditions = NO_CONDITIONS) {
  return render(
    <AdminProductFilterSelect
      conditions={conditions}
      field="categoryCodes"
      label="分類"
      options={OPTIONS}
    />,
  );
}

/** 候補は開かないと現れない。名前には選択の要約が続くため部分一致で探す。 */
async function open(): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: /分類/ }));
}

describe("AdminProductFilterSelect", () => {
  beforeEach(() => {
    push.mockClear();
  });
  it("入り切りした時点で一覧の URL へ移る", async () => {
    renderSelect();
    await open();
    await userEvent.click(screen.getByRole("checkbox", { name: "電子機器" }));

    expect(push).toHaveBeenCalledWith("/admin/products?categoryCodes=1");
  });

  it("同じ条件を複数選べる", async () => {
    renderSelect({ ...NO_CONDITIONS, categoryCodes: ["1"] });
    await open();
    await userEvent.click(screen.getByRole("checkbox", { name: "書籍" }));

    expect(push).toHaveBeenCalledWith("/admin/products?categoryCodes=1&categoryCodes=2");
  });

  it("いま効いている他の条件を引き継ぐ", async () => {
    renderSelect({ ...NO_CONDITIONS, keyword: "鞄", statusCodes: ["2"] });
    await open();
    await userEvent.click(screen.getByRole("checkbox", { name: "電子機器" }));

    expect(push).toHaveBeenCalledWith(
      "/admin/products?keyword=%E9%9E%84&categoryCodes=1&statusCodes=2",
    );
  });

  it("選ばれている条件を外すと、その値だけが URL から消える", async () => {
    renderSelect({ ...NO_CONDITIONS, categoryCodes: ["1", "2"], statusCodes: ["2"] });
    await open();
    await userEvent.click(screen.getByRole("checkbox", { name: "電子機器" }));

    expect(push).toHaveBeenCalledWith("/admin/products?categoryCodes=2&statusCodes=2");
  });

  it("いま効いている条件を選択に反映する", async () => {
    renderSelect({ ...NO_CONDITIONS, categoryCodes: ["1"] });
    await open();

    expect(screen.getByRole("checkbox", { name: "電子機器" })).toBeChecked();
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderSelect();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

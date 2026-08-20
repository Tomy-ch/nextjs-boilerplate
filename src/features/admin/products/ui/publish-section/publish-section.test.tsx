// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { emptyProductValues, useProductValues } from "../../use-product-values";
import { ProductPublishSection } from "./publish-section";

const STATUS_OPTIONS = [{ value: "status-1", label: "在庫あり" }];

/** 段の部品は入力の状態を外から受けるため、hook を通した本物の状態で確かめる。 */
function Harness({
  children,
}: {
  children: (form: ReturnType<typeof useProductValues>) => ReactNode;
}) {
  const form = useProductValues(emptyProductValues(), { withQuantity: true });

  return <>{children(form)}</>;
}

function renderSection() {
  return render(
    <Harness>
      {(form) => (
        <ProductPublishSection form={form} idPrefix="form" statusOptions={STATUS_OPTIONS} />
      )}
    </Harness>,
  );
}

describe("ProductPublishSection", () => {
  // ----- 正常系 -----
  it("状態と公開日時を並べる", () => {
    renderSection();

    expect(screen.getByLabelText("状態")).toBeInTheDocument();
    expect(screen.getByLabelText("公開日時")).toBeInTheDocument();
  });

  it("公開日時を入れると、未公開へ戻す操作が押せるようになる", () => {
    renderSection();

    fireEvent.change(screen.getByLabelText("公開日時"), {
      target: { value: "2026-08-07T09:00" },
    });

    expect(screen.getByRole("button", { name: "非公開にする" })).toBeEnabled();
  });

  it("未公開へ戻す操作は、公開日時を 1 度で空へ戻す", () => {
    renderSection();

    fireEvent.change(screen.getByLabelText("公開日時"), {
      target: { value: "2026-08-07T09:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "非公開にする" }));

    expect(screen.getByLabelText("公開日時")).toHaveValue("");
  });

  // ----- 異常系 -----
  it("既に未公開なら、戻す操作は押せない", () => {
    renderSection();

    expect(screen.getByRole("button", { name: "非公開にする" })).toBeDisabled();
  });

  it("状態を選び直して空にすると誤りを出す", () => {
    renderSection();

    fireEvent.change(screen.getByLabelText("状態"), { target: { value: "" } });

    expect(screen.getByText("状態を選んでください。")).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderSection();

    expect((await axe(container)).violations).toEqual([]);
  });
});

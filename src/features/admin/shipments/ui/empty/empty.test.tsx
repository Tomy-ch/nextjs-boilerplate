// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ShipmentQueueEmpty } from "./empty";

describe("ShipmentQueueEmpty", () => {
  it("発送を待っている注文が無いことを伝える", () => {
    render(<ShipmentQueueEmpty />);

    expect(screen.getByText("発送を待っている注文はありません。")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ShipmentQueueEmpty />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

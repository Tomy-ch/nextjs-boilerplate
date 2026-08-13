// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { SampleNotice } from "./sample-notice";

describe("SampleNotice", () => {
  it("サンプルであることを見出しで伝える", () => {
    render(<SampleNotice />);

    expect(screen.getByText("サンプルサイトです")).toBeVisible();
  });

  it("掲載物が実在しないことと、購入・決済が機能しないことを伝える", () => {
    render(<SampleNotice />);

    const body = screen.getByRole("alert").textContent ?? "";

    expect(body).toContain("実在せず");
    expect(body).toContain("購入・決済も機能しません");
  });

  it("注意として伝える", () => {
    render(<SampleNotice />);

    expect(screen.getByRole("alert")).toBeVisible();
  });

  it("閉じる操作を持たない", () => {
    render(<SampleNotice />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("a11y 違反が無い", async () => {
    const { container } = render(<SampleNotice />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

// @vitest-environment jsdom

import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { profileSchema } from "@/model/user/profile-schema";

import { ProfileEditSkeleton } from "./skeleton";

const FIELD_COUNT = Object.keys(profileSchema.shape).length;

describe("ProfileEditSkeleton", () => {
  it("入力規則が持つ項目数だけ枠を出す", () => {
    const { container } = render(<ProfileEditSkeleton />);

    expect(container.querySelectorAll("[data-slot=skeleton]")).toHaveLength(FIELD_COUNT * 2);
  });

  it("項目ごとに項目名と入力欄の枠を対で出す", () => {
    const { container } = render(<ProfileEditSkeleton />);
    const [label, control] = container.querySelectorAll("[data-slot=skeleton]");

    expect(label).toHaveClass("h-4");
    expect(control).toHaveClass("h-10");
  });

  it("待機している間は読める中身を出さない", () => {
    const { container } = render(<ProfileEditSkeleton />);

    expect(container.textContent).toBe("");
  });

  it("待機表示そのものを読み上げから外す", () => {
    const { container } = render(<ProfileEditSkeleton />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(within(container).queryAllByRole("generic")).toHaveLength(0);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ProfileEditSkeleton />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

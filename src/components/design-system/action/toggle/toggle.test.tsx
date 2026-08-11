// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { useCallback, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Toggle, toggleVariants } from "./toggle";

function ControlledFixture() {
  const [pressed, setPressed] = useState(false);
  const toggle = useCallback(() => setPressed((current) => !current), []);

  return (
    <Toggle onClick={toggle} pressed={pressed}>
      折り返す
    </Toggle>
  );
}

describe("Toggle", () => {
  it("押下状態を aria-pressed で公開する", () => {
    render(<Toggle pressed>折り返す</Toggle>);

    const toggle = screen.getByRole("button", { name: "折り返す", pressed: true });

    expect(toggle).toHaveAttribute("data-slot", "toggle");
  });

  it("未押下のときは aria-pressed が false になる", () => {
    render(<Toggle pressed={false}>折り返す</Toggle>);

    expect(screen.getByRole("button", { name: "折り返す" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("状態が変わってもアクセシブルな名前は変えない", () => {
    render(<ControlledFixture />);

    const toggle = screen.getByRole("button", { name: "折り返す" });
    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "折り返す", pressed: true })).toBe(toggle);
  });

  it("呼び出し元が保持する state を反映する", () => {
    render(<ControlledFixture />);

    fireEvent.click(screen.getByRole("button", { name: "折り返す" }));

    expect(screen.getByRole("button", { name: "折り返す" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("既定では form を送信しない type=button になる", () => {
    render(<Toggle pressed={false}>折り返す</Toggle>);

    expect(screen.getByRole("button", { name: "折り返す" })).toHaveAttribute("type", "button");
  });

  it("native form へ載せるため type と name / value を上書きできる", () => {
    render(
      <Toggle name="density" pressed={false} type="submit" value="compact">
        表示密度
      </Toggle>,
    );

    const toggle = screen.getByRole("button", { name: "表示密度" });

    expect(toggle).toHaveAttribute("type", "submit");
    expect(toggle).toHaveAttribute("name", "density");
    expect(toggle).toHaveAttribute("value", "compact");
  });

  it("disabled のとき操作を受け付けない", () => {
    const onClick = vi.fn();
    render(
      <Toggle disabled onClick={onClick} pressed={false}>
        折り返す
      </Toggle>,
    );

    const toggle = screen.getByRole("button", { name: "折り返す" });
    fireEvent.click(toggle);

    expect(toggle).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("variant と size で見た目を切り替える", () => {
    render(
      <Toggle pressed={false} size="lg" variant="outline">
        折り返す
      </Toggle>,
    );

    expect(screen.getByRole("button", { name: "折り返す" })).toHaveClass("border-input", "h-10");
  });

  it("icon だけの場合も aria-label で名前を与えられる", () => {
    render(
      <Toggle aria-label="折り返す" pressed>
        <svg aria-hidden="true" />
      </Toggle>,
    );

    expect(screen.getByRole("button", { name: "折り返す", pressed: true })).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Toggle pressed>折り返す</Toggle>);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("toggleVariants", () => {
  // ----- 正常系 -----
  it("既定の見た目の class を返す", () => {
    expect(toggleVariants()).toContain("inline-flex");
  });

  it("variant と size の指定を class へ反映する", () => {
    expect(toggleVariants({ variant: "outline" })).not.toBe(toggleVariants());
    expect(toggleVariants({ size: "sm" })).not.toBe(toggleVariants());
  });
});

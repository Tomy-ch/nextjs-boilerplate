// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  ListItemContent,
  ListItemDescription,
  ListItemTitle,
} from "@/components/design-system/display/list/list";

import { Stepper, StepperItem } from "./stepper";
import { STEPPER_STATE } from "./stepper.definition";

function Fixture() {
  return (
    <Stepper label="申請の進捗">
      <StepperItem marker={1} state={STEPPER_STATE.COMPLETE}>
        <ListItemContent>
          <ListItemTitle>申請</ListItemTitle>
          <ListItemDescription>2026-08-01 に受け付けました</ListItemDescription>
        </ListItemContent>
      </StepperItem>
      <StepperItem marker={2} state={STEPPER_STATE.CURRENT}>
        <ListItemContent>
          <ListItemTitle>審査</ListItemTitle>
        </ListItemContent>
      </StepperItem>
      <StepperItem marker={3}>
        <ListItemContent>
          <ListItemTitle>完了</ListItemTitle>
        </ListItemContent>
      </StepperItem>
    </Stepper>
  );
}

/**
 * 段の中の印を取り出す。
 *
 * @remarks
 * 印は利用者から掴める名前を持たないため、`data-slot` で引くしかありません。段そのものは
 * `listitem` として引けるので、木の全体ではなくその段の中だけを見ます。
 */
function markerOf(item: HTMLElement | undefined): Element | null {
  return item?.querySelector("[data-slot='stepper-item-marker']") ?? null;
}

describe("Stepper", () => {
  it("現在地でも済ませていれば、印と読み上げの両方でそれを示す", () => {
    render(
      <Stepper label="申請の進捗">
        <StepperItem marker={1} passed={true} state="current">
          入力
        </StepperItem>
      </Stepper>,
    );

    const item = screen.getByRole("listitem");

    expect(item).toHaveAttribute("data-state", "current");
    expect(item.querySelector('[data-slot="stepper-item-marker"] svg')).toBeInTheDocument();
    expect(item).toHaveTextContent("現在の段階・完了");
  });

  it("横に並べる指定では、向きを属性としても示す", () => {
    render(
      <Stepper label="申請の進捗" orientation="horizontal">
        <StepperItem marker={1} state="current">
          入力
        </StepperItem>
      </Stepper>,
    );

    const list = screen.getByRole("list", { name: "申請の進捗" });

    expect(list).toHaveAttribute("data-orientation", "horizontal");
    expect(list).toHaveClass("flex-row");
  });

  it("並び順に意味のある一覧として、名前つきで並べる", () => {
    render(<Fixture />);

    const list = screen.getByRole("list", { name: "申請の進捗" });

    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });

  it("現在地だけへ aria-current を与える", () => {
    render(<Fixture />);

    const items = screen.getAllByRole("listitem");

    expect(items[0]).not.toHaveAttribute("aria-current");
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[2]).not.toHaveAttribute("aria-current");
  });

  it("状態を色と印だけでなく、読み上げ用の語でも示す", () => {
    render(<Fixture />);

    expect(screen.getByText("完了", { selector: ".sr-only" })).toBeInTheDocument();
    expect(screen.getByText("現在の段階")).toBeInTheDocument();
    expect(screen.getByText("未着手")).toBeInTheDocument();
  });

  it("通過済みは番号ではなく check を出す", () => {
    render(<Fixture />);

    const [completed, current] = screen.getAllByRole("listitem");

    expect(markerOf(completed)?.querySelector("svg")).toBeInTheDocument();
    expect(markerOf(completed)?.textContent).not.toContain("1");
    expect(markerOf(current)?.textContent).toContain("2");
  });

  it("state を省くと未着手として扱う", () => {
    render(
      <Stepper label="進捗">
        <StepperItem marker={1}>
          <ListItemContent>
            <ListItemTitle>入力</ListItemTitle>
          </ListItemContent>
        </StepperItem>
      </Stepper>,
    );

    expect(screen.getByRole("listitem")).toHaveAttribute("data-state", STEPPER_STATE.UPCOMING);
  });

  it("marker を省いても印の枠は残る", () => {
    render(
      <Stepper label="進捗">
        <StepperItem state={STEPPER_STATE.CURRENT}>
          <ListItemContent>
            <ListItemTitle>入力</ListItemTitle>
          </ListItemContent>
        </StepperItem>
      </Stepper>,
    );

    const marker = markerOf(screen.getByRole("listitem"));

    expect(marker).toBeInTheDocument();
    expect(marker?.textContent).toBe("現在の段階");
  });

  it("状態の語を段階の呼び名へ差し替えられる", () => {
    render(
      <Stepper label="承認の進捗">
        <StepperItem marker={1} state={STEPPER_STATE.COMPLETE} stateLabel="承認済み">
          <ListItemContent>
            <ListItemTitle>一次承認</ListItemTitle>
          </ListItemContent>
        </StepperItem>
      </Stepper>,
    );

    expect(screen.getByText("承認済み")).toBeInTheDocument();
    expect(screen.queryByText("完了")).not.toBeInTheDocument();
  });

  it("段階の遷移や操作を持たず、渡された state をそのまま描く", () => {
    render(<Fixture />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Fixture />);

    const result = await axe(container, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });
});

describe("StepperItem", () => {
  it("段 1 件として slot を持つ listitem を描画する", () => {
    render(<Fixture />);

    expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("data-slot", "stepper-item");
  });

  it("段の状態を data 属性として持たせる", () => {
    render(<Fixture />);

    expect(screen.getAllByRole("listitem")[0]).toHaveAttribute(
      "data-state",
      STEPPER_STATE.COMPLETE,
    );
  });
});

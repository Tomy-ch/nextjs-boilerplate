// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";
import { DRAWER_DIRECTION, type DrawerDirection } from "./drawer.definition";

beforeAll(() => {
  // vaul は開くときに媒体クエリを参照するが、jsdom は matchMedia を持たないためここで補う。
  window.matchMedia ??= vi.fn().mockReturnValue({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

function DrawerFixture({
  defaultOpen = false,
  direction,
  dismissible,
  open,
}: {
  defaultOpen?: boolean;
  direction?: DrawerDirection;
  dismissible?: boolean;
  open?: boolean;
}) {
  return (
    <Drawer defaultOpen={defaultOpen} direction={direction} dismissible={dismissible} open={open}>
      <DrawerTrigger>補足を開く</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>表示条件</DrawerTitle>
          <DrawerDescription>条件を満たす項目だけを一覧に表示します。</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <DrawerClose>戻る</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

describe("Drawer", () => {
  it("開くまで内容を表示しない", () => {
    render(<DrawerFixture />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("trigger の操作で開き、title と説明を関連付ける", () => {
    render(<DrawerFixture />);

    fireEvent.click(screen.getByRole("button", { name: "補足を開く" }));

    const content = screen.getByRole("dialog", { name: "表示条件" });

    expect(content).toHaveAttribute("data-slot", "drawer-content");
    expect(content).toHaveAccessibleDescription("条件を満たす項目だけを一覧に表示します。");
  });

  it("不可逆操作の確認用ではないため alertdialog ではなく dialog の意味論を持つ", () => {
    render(<DrawerFixture defaultOpen />);

    expect(screen.getByRole("dialog", { name: "表示条件" })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("既定では画面下端から引き出す", () => {
    render(<DrawerFixture defaultOpen />);

    expect(screen.getByRole("dialog", { name: "表示条件" })).toHaveAttribute(
      "data-vaul-drawer-direction",
      DRAWER_DIRECTION.BOTTOM,
    );
  });

  it("direction で指定した方向から引き出す", () => {
    render(<DrawerFixture defaultOpen direction={DRAWER_DIRECTION.RIGHT} />);

    expect(screen.getByRole("dialog", { name: "表示条件" })).toHaveAttribute(
      "data-vaul-drawer-direction",
      DRAWER_DIRECTION.RIGHT,
    );
  });

  it("drag を促す掴み手は装飾として支援技術から隠す", () => {
    const { baseElement } = render(<DrawerFixture defaultOpen />);

    const handle = baseElement.querySelector("[data-slot='drawer-handle']");

    expect(handle).toHaveAttribute("aria-hidden", "true");
  });

  it("開いている間は trigger を含む背面を支援技術から隠す", () => {
    const { baseElement } = render(<DrawerFixture defaultOpen />);

    const trigger = baseElement.querySelector("[data-slot='drawer-trigger']");

    expect(screen.queryByRole("button", { name: "補足を開く" })).not.toBeInTheDocument();
    expect(trigger?.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("trigger の aria-controls は実在する dialog の id を指す", () => {
    const { baseElement } = render(<DrawerFixture defaultOpen />);

    const trigger = baseElement.querySelector("[data-slot='drawer-trigger']");
    const content = screen.getByRole("dialog", { name: "表示条件" });

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", content.id);
  });

  it("DrawerClose で内容側から閉じられる", () => {
    render(<DrawerFixture defaultOpen />);

    fireEvent.click(screen.getByRole("button", { name: "戻る" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Escape で閉じる", () => {
    render(<DrawerFixture defaultOpen />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("dismissible を false にすると Escape でも DrawerClose でも閉じない", () => {
    render(<DrawerFixture defaultOpen dismissible={false} />);

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "戻る" }));

    expect(screen.getByRole("dialog", { name: "表示条件" })).toBeInTheDocument();
  });

  it("dismissible が false でも open を制御すれば閉じられる", () => {
    const { rerender } = render(<DrawerFixture dismissible={false} open />);

    expect(screen.getByRole("dialog", { name: "表示条件" })).toBeInTheDocument();

    rerender(<DrawerFixture dismissible={false} open={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("DrawerPortal と DrawerOverlay を直接指定して描画先と背面を差し替えられる", () => {
    render(
      <Drawer defaultOpen>
        <DrawerTrigger>開く</DrawerTrigger>
        <DrawerPortal>
          <DrawerOverlay data-testid="overlay" />
          <DrawerContent>
            <DrawerTitle>差し替え</DrawerTitle>
            <DrawerDescription>背面と描画先を明示した場合の構成です。</DrawerDescription>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>,
    );

    expect(screen.getByTestId("overlay")).toHaveAttribute("data-slot", "drawer-overlay");
    expect(screen.getByRole("dialog", { name: "差し替え" })).toBeInTheDocument();
  });

  it("開いた状態で a11y 自動検査に違反しない", async () => {
    const { baseElement } = render(<DrawerFixture defaultOpen />);

    const result = await axe(baseElement, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

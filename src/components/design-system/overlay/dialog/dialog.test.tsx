// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

function DialogFixture({
  defaultOpen = false,
  showCloseButton = true,
}: {
  defaultOpen?: boolean;
  showCloseButton?: boolean;
}) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger>詳細を見る</DialogTrigger>
      <DialogContent showCloseButton={showCloseButton}>
        <DialogHeader>
          <DialogTitle>表示条件</DialogTitle>
          <DialogDescription>条件を満たす項目だけを一覧に表示します。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>戻る</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("開くまで内容を表示しない", () => {
    render(<DialogFixture />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("trigger の操作で modal を開き、title と説明を関連付ける", () => {
    render(<DialogFixture />);

    fireEvent.click(screen.getByRole("button", { name: "詳細を見る" }));

    const content = screen.getByRole("dialog", { name: "表示条件" });

    expect(content).toHaveAttribute("data-slot", "dialog-content");
    expect(content).toHaveAccessibleDescription("条件を満たす項目だけを一覧に表示します。");
  });

  it("不可逆操作用ではないため alertdialog ではなく dialog の意味論を持つ", () => {
    render(<DialogFixture defaultOpen />);

    expect(screen.getByRole("dialog", { name: "表示条件" })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("ページ内容へ重ねても背後が透けない不透明な面として描画する", () => {
    render(<DialogFixture defaultOpen />);

    expect(screen.getByRole("dialog", { name: "表示条件" })).toHaveClass(
      "bg-background",
      "text-foreground",
      "border-border",
    );
  });

  it("右上の閉じる操作は読み上げ可能な名前を持ち、押すと閉じる", () => {
    render(<DialogFixture defaultOpen />);

    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("showCloseButton を false にすると右上の閉じる操作を描画しない", () => {
    render(<DialogFixture defaultOpen showCloseButton={false} />);

    expect(screen.queryByRole("button", { name: "閉じる" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "表示条件" })).toBeInTheDocument();
  });

  it("DialogClose で内容側からも閉じられる", () => {
    render(<DialogFixture defaultOpen />);

    fireEvent.click(screen.getByRole("button", { name: "戻る" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Escape で閉じる", () => {
    render(<DialogFixture defaultOpen />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("DialogPortal と DialogOverlay を直接指定して描画先と背面を差し替えられる", () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>開く</DialogTrigger>
        <DialogPortal>
          <DialogOverlay data-testid="overlay" />
          <DialogContent showCloseButton={false}>
            <DialogTitle>差し替え</DialogTitle>
            <DialogDescription>背面と描画先を明示した場合の構成です。</DialogDescription>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    expect(screen.getByTestId("overlay")).toHaveAttribute("data-slot", "dialog-overlay");
    expect(screen.getByRole("dialog", { name: "差し替え" })).toBeInTheDocument();
  });

  it("開いた状態で a11y 自動検査に違反しない", async () => {
    const { baseElement } = render(<DialogFixture defaultOpen />);

    const result = await axe(baseElement, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

function Example({ defaultOpen = false }: { defaultOpen?: boolean } = {}) {
  return (
    <AlertDialog defaultOpen={defaultOpen}>
      <AlertDialogTrigger>開く</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>確認</AlertDialogTitle>
          <AlertDialogDescription>続行しますか？</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>戻る</AlertDialogCancel>
          <AlertDialogAction>続行</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
describe("AlertDialog", () => {
  it("開閉と確認 dialog の意味論を提供する", async () => {
    render(<Example />);
    fireEvent.click(screen.getByRole("button", { name: "開く" }));
    expect(screen.getByRole("alertdialog", { name: "確認" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "戻る" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
  it("Escape で閉じる", () => {
    render(<Example defaultOpen />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    // Portal で body 直下へ描くため baseElement を渡す。container では trigger しか入らず、
    // 検査対象が空になる。
    const { baseElement } = render(<Example defaultOpen />);

    expect(
      (await axe(baseElement, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

describe("AlertDialogTrigger", () => {
  // ----- 正常系 -----
  it("押すと確認内容を開く", () => {
    render(<Example />);

    fireEvent.click(screen.getByRole("button", { name: "開く" }));

    expect(screen.getByRole("alertdialog")).toBeVisible();
  });
});

describe("AlertDialogPortal", () => {
  // ----- 正常系 -----
  it("内容を呼び出し位置の外へ描画する", () => {
    const { container } = render(<Example defaultOpen />);

    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(container.querySelector('[data-slot="alert-dialog-content"]')).toBeNull();
  });
});

describe("AlertDialogOverlay", () => {
  // ----- 正常系 -----
  it("開いている間だけ背面の覆いを描画する", () => {
    render(<Example defaultOpen />);

    expect(document.querySelector('[data-slot="alert-dialog-overlay"]')).not.toBeNull();
  });

  // ----- 異常系 -----
  it("閉じている間は背面の覆いを描画しない", () => {
    render(<Example />);

    expect(document.querySelector('[data-slot="alert-dialog-overlay"]')).toBeNull();
  });
});

describe("AlertDialogContent", () => {
  // ----- 正常系 -----
  it("開いた内容として slot を持つ要素を描画する", () => {
    render(<Example defaultOpen />);

    expect(screen.getByRole("alertdialog")).toHaveAttribute("data-slot", "alert-dialog-content");
  });

  // ----- 異常系 -----
  it("閉じている間は内容を描画しない", () => {
    render(<Example />);

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("AlertDialogHeader", () => {
  // ----- 正常系 -----
  it("見出し枠として slot を持つ要素を描画する", () => {
    render(<Example defaultOpen />);

    expect(document.querySelector('[data-slot="alert-dialog-header"]')).not.toBeNull();
  });
});

describe("AlertDialogFooter", () => {
  // ----- 正常系 -----
  it("操作枠として slot を持つ要素を描画する", () => {
    render(<Example defaultOpen />);

    expect(document.querySelector('[data-slot="alert-dialog-footer"]')).not.toBeNull();
  });
});

describe("AlertDialogTitle", () => {
  // ----- 正常系 -----
  it("題名として slot を持つ要素を描画する", () => {
    render(<Example defaultOpen />);

    expect(screen.getByText("確認")).toHaveAttribute("data-slot", "alert-dialog-title");
  });
});

describe("AlertDialogDescription", () => {
  // ----- 正常系 -----
  it("補足として slot を持つ要素を描画する", () => {
    render(<Example defaultOpen />);

    expect(screen.getByText("続行しますか？")).toHaveAttribute(
      "data-slot",
      "alert-dialog-description",
    );
  });
});

describe("AlertDialogAction", () => {
  // ----- 正常系 -----
  it("続行の操作として slot を持つ要素を描画する", () => {
    render(<Example defaultOpen />);

    expect(screen.getByRole("button", { name: "続行" })).toHaveAttribute(
      "data-slot",
      "alert-dialog-action",
    );
  });

  it("押すと確認内容を閉じる", () => {
    render(<Example defaultOpen />);

    fireEvent.click(screen.getByRole("button", { name: "続行" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("AlertDialogCancel", () => {
  // ----- 正常系 -----
  it("取り消しの操作として slot を持つ要素を描画する", () => {
    render(<Example defaultOpen />);

    expect(screen.getByRole("button", { name: "戻る" })).toHaveAttribute(
      "data-slot",
      "alert-dialog-cancel",
    );
  });

  it("押すと確認内容を閉じる", () => {
    render(<Example defaultOpen />);

    fireEvent.click(screen.getByRole("button", { name: "戻る" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

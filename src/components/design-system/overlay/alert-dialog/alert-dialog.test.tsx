// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useState } from "react";
import { describe, expect, it, vi } from "vitest";
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

function TriggerlessExample() {
  const [open, setOpen] = useState(false);
  const [invokerShown, setInvokerShown] = useState(true);
  const openSurface = useCallback(() => setOpen(true), []);
  const hideInvoker = useCallback(() => setInvokerShown(false), []);

  return (
    <>
      <section aria-label="一覧" tabIndex={-1}>
        {invokerShown ? (
          <button onClick={openSurface} type="button">
            対象を確認する
          </button>
        ) : null}
      </section>
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認</AlertDialogTitle>
            <AlertDialogDescription>続行しますか？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>戻る</AlertDialogCancel>
            <AlertDialogAction onClick={hideInvoker}>続行</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

describe("AlertDialog", () => {
  it("開閉と確認 dialog の意味論を提供する", async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole("button", { name: "開く" }));
    expect(screen.getByRole("alertdialog", { name: "確認" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "戻る" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
  it("Escape で閉じる", async () => {
    render(<Example defaultOpen />);

    await userEvent.keyboard("{Escape}");

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
  it("押すと確認内容を開く", async () => {
    render(<Example />);

    await userEvent.click(screen.getByRole("button", { name: "開く" }));

    expect(screen.getByRole("alertdialog")).toBeVisible();
  });
});

describe("AlertDialogPortal", () => {
  it("内容を呼び出し位置の外へ描画する", () => {
    const { container } = render(<Example defaultOpen />);

    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(container.querySelector('[data-slot="alert-dialog-content"]')).toBeNull();
  });
});

describe("AlertDialogOverlay", () => {
  it("開いている間だけ背面の覆いを描画する", () => {
    render(<Example defaultOpen />);

    expect(document.querySelector('[data-slot="alert-dialog-overlay"]')).not.toBeNull();
  });

  it("閉じている間は背面の覆いを描画しない", () => {
    render(<Example />);

    expect(document.querySelector('[data-slot="alert-dialog-overlay"]')).toBeNull();
  });
});

describe("AlertDialogContent", () => {
  it("開いた内容として slot を持つ要素を描画する", () => {
    render(<Example defaultOpen />);

    expect(screen.getByRole("alertdialog")).toHaveAttribute("data-slot", "alert-dialog-content");
  });

  it("閉じている間は内容を描画しない", () => {
    render(<Example />);

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("trigger から開いたときは、閉じると trigger へ focus を戻す", async () => {
    render(<Example />);

    await userEvent.click(screen.getByRole("button", { name: "開く" }));
    await userEvent.click(screen.getByRole("button", { name: "戻る" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "開く" })).toHaveFocus());
  });

  it("trigger を持たないときは、閉じると開いたときに focus があった要素へ戻す", async () => {
    render(<TriggerlessExample />);

    await userEvent.click(screen.getByRole("button", { name: "対象を確認する" }));
    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "対象を確認する" })).toHaveFocus(),
    );
  });

  it("開いたときに focus があった要素が閉じる間に消えたら、focus できる最も近い祖先へ戻す", async () => {
    render(<TriggerlessExample />);

    await userEvent.click(screen.getByRole("button", { name: "対象を確認する" }));
    await userEvent.click(screen.getByRole("button", { name: "続行" }));

    await waitFor(() => expect(screen.getByRole("region", { name: "一覧" })).toHaveFocus());
  });

  it("呼び出し側の onCloseAutoFocus が既定を止めたら、閉じても trigger へ focus を戻さない", async () => {
    const onCloseAutoFocus = vi.fn((event: Event) => event.preventDefault());

    render(
      <AlertDialog>
        <AlertDialogTrigger>開く</AlertDialogTrigger>
        <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
          <AlertDialogTitle>確認</AlertDialogTitle>
          <AlertDialogDescription>続行しますか？</AlertDialogDescription>
          <AlertDialogCancel>戻る</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );

    await userEvent.click(screen.getByRole("button", { name: "開く" }));
    await userEvent.click(screen.getByRole("button", { name: "戻る" }));

    await waitFor(() => expect(onCloseAutoFocus).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("button", { name: "開く" })).not.toHaveFocus();
  });
});

describe("AlertDialogHeader", () => {
  it("見出し枠として slot を持つ要素を描画する", () => {
    render(<Example defaultOpen />);

    expect(document.querySelector('[data-slot="alert-dialog-header"]')).not.toBeNull();
  });
});

describe("AlertDialogFooter", () => {
  it("操作枠として slot を持つ要素を描画する", () => {
    render(<Example defaultOpen />);

    expect(document.querySelector('[data-slot="alert-dialog-footer"]')).not.toBeNull();
  });
});

describe("AlertDialogTitle", () => {
  it("題名として slot を持つ要素を描画する", () => {
    render(<Example defaultOpen />);

    expect(screen.getByText("確認")).toHaveAttribute("data-slot", "alert-dialog-title");
  });
});

describe("AlertDialogDescription", () => {
  it("補足として slot を持つ要素を描画する", () => {
    render(<Example defaultOpen />);

    expect(screen.getByText("続行しますか？")).toHaveAttribute(
      "data-slot",
      "alert-dialog-description",
    );
  });
});

describe("AlertDialogAction", () => {
  it("続行の操作として slot を持つ要素を描画する", () => {
    render(<Example defaultOpen />);

    expect(screen.getByRole("button", { name: "続行" })).toHaveAttribute(
      "data-slot",
      "alert-dialog-action",
    );
  });

  it("押すと確認内容を閉じる", async () => {
    render(<Example defaultOpen />);

    await userEvent.click(screen.getByRole("button", { name: "続行" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("AlertDialogCancel", () => {
  it("取り消しの操作として slot を持つ要素を描画する", () => {
    render(<Example defaultOpen />);

    expect(screen.getByRole("button", { name: "戻る" })).toHaveAttribute(
      "data-slot",
      "alert-dialog-cancel",
    );
  });

  it("押すと確認内容を閉じる", async () => {
    render(<Example defaultOpen />);

    await userEvent.click(screen.getByRole("button", { name: "戻る" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

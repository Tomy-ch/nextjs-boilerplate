// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Toaster, ToastProvider, useToast } from "./toaster";
import { TOAST_POSITION, TOAST_VARIANT } from "./toaster.definition";

function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
}

describe("Toaster", () => {
  it("通知を表示し、dismiss を呼び出す", async () => {
    const onDismiss = vi.fn();
    render(<Toaster onDismiss={onDismiss} toasts={[{ id: "1", title: "保存しました" }]} />);
    await userEvent.click(screen.getByRole("button", { name: "通知を閉じる" }));
    expect(onDismiss).toHaveBeenCalledWith("1");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("queue から外れた通知は、同じ id で再び出せる", async () => {
    const { rerender } = render(<Toaster toasts={[{ id: "1", title: "保存に失敗しました" }]} />);
    await userEvent.click(screen.getByRole("button", { name: "通知を閉じる" }));

    rerender(<Toaster toasts={[]} />);
    rerender(<Toaster toasts={[{ id: "1", title: "保存に失敗しました" }]} />);

    expect(screen.getByRole("status")).toHaveTextContent("保存に失敗しました");
  });

  it("失敗だけを割り込みで読み上げ、ほかは順番を待たせる", () => {
    render(
      <Toaster
        toasts={[
          { id: "1", title: "保存に失敗しました", variant: TOAST_VARIANT.DESTRUCTIVE },
          { id: "2", title: "保存しました" },
        ]}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("保存に失敗しました");
    expect(screen.getByRole("status")).toHaveTextContent("保存しました");
  });

  it("同時に表示する件数を上限で抑える", () => {
    render(
      <Toaster
        toasts={[
          { id: "1", title: "一件目" },
          { id: "2", title: "二件目" },
          { id: "3", title: "三件目" },
        ]}
        visibleToasts={2}
      />,
    );

    expect(screen.getByText("一件目")).toBeInTheDocument();
    expect(screen.getByText("二件目")).toBeInTheDocument();
    expect(screen.queryByText("三件目")).not.toBeInTheDocument();
  });

  it("上限を超えた通知は、表示中の通知が閉じると現れる", async () => {
    render(
      <Toaster
        toasts={[
          { id: "1", title: "一件目" },
          { id: "2", title: "二件目" },
        ]}
        visibleToasts={1}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "通知を閉じる" }));

    expect(screen.getByText("二件目")).toBeInTheDocument();
  });

  it("action を選ぶと処理を実行して通知を閉じる", async () => {
    const onClick = vi.fn();
    const onDismiss = vi.fn();
    render(
      <Toaster
        onDismiss={onDismiss}
        toasts={[{ action: { label: "元に戻す", onClick }, id: "1", title: "削除しました" }]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "元に戻す" }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledWith("1");
  });

  it("action を渡さなければ操作を表示しない", () => {
    render(<Toaster toasts={[{ id: "1", title: "保存しました" }]} />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("上限に 0 以下を渡しても、末尾を落とさず何も表示しない", () => {
    render(
      <Toaster
        toasts={[
          { id: "1", title: "一件目" },
          { id: "2", title: "二件目" },
        ]}
        visibleToasts={-1}
      />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("色を敷く variant でも、面の下地を不透明にする", () => {
    render(
      <Toaster
        toasts={[
          { id: "1", title: "保存に失敗しました", variant: TOAST_VARIANT.DESTRUCTIVE },
          { id: "2", title: "確認してください", variant: TOAST_VARIANT.WARNING },
        ]}
      />,
    );

    const surfaces = document.querySelectorAll("[data-slot='toast']");

    expect(surfaces).toHaveLength(2);
    for (const surface of surfaces) {
      expect(surface).toHaveClass("bg-background");
    }
  });

  it("通知を名前つきの landmark へ収める", () => {
    render(<Toaster toasts={[{ id: "1", title: "保存しました" }]} />);

    const region = screen.getByRole("region", { name: "通知" });

    expect(region).toContainElement(screen.getByRole("status"));
  });

  it("hotkey を押すと通知の領域へ focus を移す", async () => {
    render(<Toaster toasts={[{ id: "1", title: "保存しました" }]} />);

    const region = screen.getByRole("region", { name: "通知" });

    expect(region).not.toHaveFocus();

    await userEvent.keyboard("{Alt>}t{/Alt}");

    expect(region).toHaveFocus();
  });

  it("修飾キーやキーが合わない打鍵では focus を奪わない", async () => {
    render(<Toaster toasts={[{ id: "1", title: "保存しました" }]} />);

    const region = screen.getByRole("region", { name: "通知" });

    await userEvent.keyboard("t");
    await userEvent.keyboard("{Alt>}s{/Alt}");
    await userEvent.keyboard("{Control>}{Alt>}t{/Alt}{/Control}");
    await userEvent.keyboard("{Meta>}{Alt>}t{/Alt}{/Meta}");
    await userEvent.keyboard("{Shift>}{Alt>}t{/Alt}{/Shift}");

    expect(region).not.toHaveFocus();
  });

  it("既定では畳んで重ね、hover すると展開する", async () => {
    render(
      <Toaster
        toasts={[
          { id: "1", title: "一件目" },
          { id: "2", title: "二件目" },
        ]}
      />,
    );

    const region = screen.getByRole("region", { name: "通知" });
    const items = () => Array.from(region.querySelectorAll("li"));

    expect(items()[1]?.style.transform).not.toBe("");

    await userEvent.hover(region);

    expect(items()[1]?.style.transform).toBe("");

    await userEvent.unhover(region);

    expect(items()[1]?.style.transform).not.toBe("");
  });

  it("領域内へ focus が入ると展開し、外れると畳み直す", () => {
    render(
      <Toaster
        toasts={[
          { id: "1", title: "一件目" },
          { id: "2", title: "二件目" },
        ]}
      />,
    );

    const region = screen.getByRole("region", { name: "通知" });
    const secondItem = () => region.querySelectorAll("li")[1];

    fireEvent.focus(region);

    expect(secondItem()?.style.transform).toBe("");

    fireEvent.blur(region);

    expect(secondItem()?.style.transform).not.toBe("");
  });

  it("左端に積んだ場合は左へ払って閉じる", () => {
    const onDismiss = vi.fn();
    render(
      <Toaster
        onDismiss={onDismiss}
        position={TOAST_POSITION.BOTTOM_LEFT}
        toasts={[{ id: "1", title: "保存しました" }]}
      />,
    );

    const item = screen.getByRole("status");

    // **払いのけは `user-event` の範囲外です。**ドラッグは扱う対象に含まれず、押した点からの
    // 移動量を伴う一連の入力を組み立てる手段がありません。
    fireEvent.pointerDown(item, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(item, { clientX: -120, clientY: 0 });
    fireEvent.pointerUp(item);

    expect(onDismiss).toHaveBeenCalledWith("1");
  });

  it("expand を指定すると畳まずに並べる", () => {
    render(
      <Toaster
        expand
        toasts={[
          { id: "1", title: "一件目" },
          { id: "2", title: "二件目" },
        ]}
      />,
    );

    const region = screen.getByRole("region", { name: "通知" });

    expect(region.querySelectorAll("li")[1]?.style.transform).toBe("");
  });

  it("払いのけると閉じる", () => {
    const onDismiss = vi.fn();
    render(<Toaster onDismiss={onDismiss} toasts={[{ id: "1", title: "保存しました" }]} />);

    const item = screen.getByRole("status");

    fireEvent.pointerDown(item, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(item, { clientX: 120, clientY: 0 });
    fireEvent.pointerUp(item);

    expect(onDismiss).toHaveBeenCalledWith("1");
  });

  it("閾値に届かない移動では閉じない", () => {
    const onDismiss = vi.fn();
    render(<Toaster onDismiss={onDismiss} toasts={[{ id: "1", title: "保存しました" }]} />);

    const item = screen.getByRole("status");

    fireEvent.pointerDown(item, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(item, { clientX: 10, clientY: 0 });
    fireEvent.pointerUp(item);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("上端へ積んだ場合は、逆向きに払いのけても閉じない", () => {
    const onDismiss = vi.fn();
    render(
      <Toaster
        onDismiss={onDismiss}
        position={TOAST_POSITION.TOP_CENTER}
        toasts={[{ id: "1", title: "保存しました" }]}
      />,
    );

    const item = screen.getByRole("status");

    fireEvent.pointerDown(item, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(item, { clientX: 0, clientY: 120 });
    fireEvent.pointerUp(item);

    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.pointerDown(item, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(item, { clientX: 0, clientY: -120 });
    fireEvent.pointerUp(item);

    expect(onDismiss).toHaveBeenCalledWith("1");
  });

  it("中央に積んだ場合は横へ払っても閉じず、縦にだけ払える", () => {
    const onDismiss = vi.fn();
    render(
      <Toaster
        onDismiss={onDismiss}
        position={TOAST_POSITION.BOTTOM_CENTER}
        toasts={[{ id: "1", title: "保存しました" }]}
      />,
    );

    const item = screen.getByRole("status");

    fireEvent.pointerDown(item, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(item, { clientX: 200, clientY: 0 });
    fireEvent.pointerUp(item);

    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.pointerDown(item, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(item, { clientX: 0, clientY: 120 });
    fireEvent.pointerUp(item);

    expect(onDismiss).toHaveBeenCalledWith("1");
  });

  it("主ボタン以外では払いのけを始めない", () => {
    const onDismiss = vi.fn();
    render(<Toaster onDismiss={onDismiss} toasts={[{ id: "1", title: "保存しました" }]} />);

    const item = screen.getByRole("status");

    fireEvent.pointerDown(item, { button: 2, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(item, { clientX: 200, clientY: 0 });
    fireEvent.pointerUp(item);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <Toaster
        toasts={[
          { action: { label: "元に戻す", onClick: vi.fn() }, id: "1", title: "保存しました" },
        ]}
      />,
    );
    expect((await axe(container)).violations).toEqual([]);
  });

  it("auto-close の progress に track と bar の色を適用する", () => {
    render(<Toaster toasts={[{ duration: 5000, id: "1", title: "保存しました" }]} />);
    expect(screen.getByRole("progressbar")).toHaveClass("bg-border");
    expect(screen.getByRole("progressbar").firstElementChild).toHaveClass("bg-foreground");
  });

  describe("duration を指定した場合", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      setDocumentHidden(false);
    });

    afterEach(() => {
      vi.useRealTimers();
      setDocumentHidden(false);
    });

    it("経過に応じて残り時間を減らす", () => {
      render(<Toaster toasts={[{ duration: 5000, id: "1", title: "保存しました" }]} />);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      const progress = screen.getByRole("progressbar");

      expect(progress).toHaveAttribute("aria-valuenow", "3000");
      expect(progress).toHaveAccessibleName("通知はあと3秒で閉じます");
    });

    it("onDismiss を渡さなくても自動閉じで通知を取り除く", () => {
      render(<Toaster toasts={[{ duration: 1000, id: "1", title: "保存しました" }]} />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("duration が 0 以下なら自動で閉じず progress も表示しない", () => {
      const onDismiss = vi.fn();
      render(
        <Toaster
          onDismiss={onDismiss}
          toasts={[{ duration: 0, id: "1", title: "保存しました" }]}
        />,
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("duration を過ぎると自動で閉じる", () => {
      const onDismiss = vi.fn();
      render(
        <Toaster
          onDismiss={onDismiss}
          toasts={[{ duration: 1000, id: "1", title: "保存しました" }]}
        />,
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onDismiss).toHaveBeenCalledWith("1");
    });

    it("hover している間は残り時間を減らさず、外れると再開する", async () => {
      const onDismiss = vi.fn();
      render(
        <Toaster
          onDismiss={onDismiss}
          toasts={[{ duration: 1000, id: "1", title: "保存しました" }]}
        />,
      );

      const region = screen.getByRole("region", { name: "通知" });

      // **この describe は偽の時計の下にあります。**`user-event` は入力の再現に自前の
      // 待ち合わせを挟むため、その下では止まったままになります。
      fireEvent.pointerOver(region);
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onDismiss).not.toHaveBeenCalled();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1000");

      fireEvent.pointerOut(region);
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onDismiss).toHaveBeenCalledWith("1");
    });

    it("領域内へ focus が入っている間は残り時間を減らさない", () => {
      const onDismiss = vi.fn();
      render(
        <Toaster
          onDismiss={onDismiss}
          toasts={[{ duration: 1000, id: "1", title: "保存しました" }]}
        />,
      );

      fireEvent.focus(screen.getByRole("region", { name: "通知" }));
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("掴んでいる間は残り時間を減らさない", () => {
      const onDismiss = vi.fn();
      render(
        <Toaster
          onDismiss={onDismiss}
          toasts={[{ duration: 1000, id: "1", title: "保存しました" }]}
        />,
      );

      const item = screen.getByRole("status");

      fireEvent.pointerDown(item, { button: 0, clientX: 0, clientY: 0 });
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onDismiss).not.toHaveBeenCalled();

      fireEvent.pointerUp(item);
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onDismiss).toHaveBeenCalledWith("1");
    });

    it("タブが背面にある間は残り時間を減らさない", () => {
      const onDismiss = vi.fn();
      render(
        <Toaster
          onDismiss={onDismiss}
          toasts={[{ duration: 1000, id: "1", title: "保存しました" }]}
        />,
      );

      setDocumentHidden(true);
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onDismiss).not.toHaveBeenCalled();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1000");

      setDocumentHidden(false);
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onDismiss).toHaveBeenCalledWith("1");
    });
  });
});

function ToastTrigger() {
  const { toast } = useToast();
  const notify = useCallback(() => {
    toast({ title: "保存しました" });
  }, [toast]);

  return (
    <button onClick={notify} type="button">
      保存
    </button>
  );
}

function MultiToastTrigger() {
  const { toast } = useToast();
  const notify = useCallback(() => {
    toast({ title: "一件目" });
    toast({ title: "二件目" });
  }, [toast]);

  return (
    <button onClick={notify} type="button">
      まとめて通知
    </button>
  );
}

function VisibleToastsControl() {
  const { visibleToasts, setVisibleToasts } = useToast();
  const widen = useCallback(() => {
    setVisibleToasts(5);
  }, [setVisibleToasts]);

  return (
    <>
      <span data-testid="visible-toasts">{visibleToasts}</span>
      <button onClick={widen} type="button">
        上限を広げる
      </button>
    </>
  );
}

function UpdateTrigger() {
  const { toast, update } = useToast();
  const idRef = useRef("");
  const start = useCallback(() => {
    idRef.current = toast({ title: "処理中です" });
  }, [toast]);
  const finish = useCallback(() => {
    update(idRef.current, { title: "完了しました" });
  }, [update]);

  return (
    <>
      <button onClick={start} type="button">
        処理を始める
      </button>
      <button onClick={finish} type="button">
        完了へ差し替える
      </button>
    </>
  );
}

describe("ToastProvider", () => {
  it("配下から呼ぶだけで通知を表示する", async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByRole("status")).toHaveTextContent("保存しました");
  });

  it("閉じた通知を queue から取り除く", async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "保存" }));
    await userEvent.click(screen.getByRole("button", { name: "通知を閉じる" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("新しい通知を先頭へ積み、上限を超えた分は表示しない", async () => {
    render(
      <ToastProvider defaultVisibleToasts={1}>
        <MultiToastTrigger />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "まとめて通知" }));

    expect(screen.getByText("二件目")).toBeInTheDocument();
    expect(screen.queryByText("一件目")).not.toBeInTheDocument();
  });

  it("上限を実行時に広げると、控えていた通知が現れる", async () => {
    render(
      <ToastProvider defaultVisibleToasts={1}>
        <MultiToastTrigger />
        <VisibleToastsControl />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "まとめて通知" }));

    expect(screen.queryByText("一件目")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "上限を広げる" }));

    expect(screen.getByText("一件目")).toBeInTheDocument();
    expect(screen.getByText("二件目")).toBeInTheDocument();
  });

  it("現在の上限を読み出せる", async () => {
    render(
      <ToastProvider defaultVisibleToasts={2}>
        <VisibleToastsControl />
      </ToastProvider>,
    );

    expect(screen.getByTestId("visible-toasts")).toHaveTextContent("2");

    await userEvent.click(screen.getByRole("button", { name: "上限を広げる" }));

    expect(screen.getByTestId("visible-toasts")).toHaveTextContent("5");
  });

  it("表示中の通知を差し替える", async () => {
    render(
      <ToastProvider>
        <UpdateTrigger />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "処理を始める" }));

    expect(screen.getByRole("status")).toHaveTextContent("処理中です");

    await userEvent.click(screen.getByRole("button", { name: "完了へ差し替える" }));

    expect(screen.queryByText("処理中です")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("完了しました");
  });

  it("差し替えは対象の通知だけに当たる", async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
        <UpdateTrigger />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "保存" }));
    await userEvent.click(screen.getByRole("button", { name: "処理を始める" }));
    await userEvent.click(screen.getByRole("button", { name: "完了へ差し替える" }));

    expect(screen.getByText("完了しました")).toBeInTheDocument();
    expect(screen.getByText("保存しました")).toBeInTheDocument();
  });

  it("すでに閉じた通知を差し替えても何も起きない", async () => {
    render(
      <ToastProvider>
        <UpdateTrigger />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "処理を始める" }));
    await userEvent.click(screen.getByRole("button", { name: "通知を閉じる" }));
    await userEvent.click(screen.getByRole("button", { name: "完了へ差し替える" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("Provider の外で useToast を呼ぶと例外を投げる", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<ToastTrigger />)).toThrow(
      "useToast は ToastProvider の内側で呼ぶ必要があります。",
    );

    consoleError.mockRestore();
  });
});

function ToastConsumer() {
  useToast();

  return null;
}

describe("useToast", () => {
  // ----- 異常系 -----
  it("Provider の外では利用を断る", () => {
    expect(() => render(<ToastConsumer />)).toThrow();
  });
});

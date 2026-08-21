// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { NavigationGuard } from "./navigation-guard";

const push = vi.fn();

function preventDefault(event: { preventDefault: () => void }) {
  event.preventDefault();
}

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockClear();
});

function GuardFixture({ when = true }: { when?: boolean }) {
  return (
    <NavigationGuard when={when}>
      <Link href="/settings">設定</Link>
      <Link href="/downloads" download>
        資料
      </Link>
      <Link href="/external" target="_blank" rel="noreferrer">
        別タブ
      </Link>
      <a href="https://example.com/other">外部サイト</a>
    </NavigationGuard>
  );
}

describe("NavigationGuard", () => {
  it("未保存のまま link を押すと遷移を止めて確認する", async () => {
    render(<GuardFixture />);

    await userEvent.click(screen.getByRole("link", { name: "設定" }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("続行すると遷移する", async () => {
    render(<GuardFixture />);
    await userEvent.click(screen.getByRole("link", { name: "設定" }));

    await userEvent.click(screen.getByRole("button", { name: "移動する" }));

    expect(push).toHaveBeenCalledWith("/settings");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("留まると遷移しない", async () => {
    render(<GuardFixture />);
    await userEvent.click(screen.getByRole("link", { name: "設定" }));

    await userEvent.click(screen.getByRole("button", { name: "留まる" }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("留まると押した link へ focus が戻る", async () => {
    render(<GuardFixture />);
    const link = screen.getByRole("link", { name: "設定" });
    link.focus();
    await userEvent.click(link);

    await userEvent.click(screen.getByRole("button", { name: "留まる" }));

    await waitFor(() => expect(link).toHaveFocus());
  });

  it("when が false なら傍受しない", async () => {
    render(<GuardFixture when={false} />);

    await userEvent.click(screen.getByRole("link", { name: "設定" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("download 指定の link は対象にしない", async () => {
    render(<GuardFixture />);

    await userEvent.click(screen.getByRole("link", { name: "資料" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("別タブで開く link は対象にしない", async () => {
    render(<GuardFixture />);

    await userEvent.click(screen.getByRole("link", { name: "別タブ" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("別 origin の link は対象にしない", async () => {
    render(<GuardFixture />);

    await userEvent.click(screen.getByRole("link", { name: "外部サイト" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("修飾キーつきの click は別タブで開く操作なので対象にしない", async () => {
    render(<GuardFixture />);

    // 修飾キーの押下状態は同じ instance の中でしか続かない。
    const user = userEvent.setup();

    await user.keyboard("{Meta>}");
    await user.click(screen.getByRole("link", { name: "設定" }));
    await user.keyboard("{/Meta}");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("現在地と同じ URL への link は遷移が起きないので対象にしない", async () => {
    render(
      <NavigationGuard when>
        <Link href={window.location.pathname}>現在地</Link>
      </NavigationGuard>,
    );

    await userEvent.click(screen.getByRole("link", { name: "現在地" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("link 以外の場所の click は傍受しない", async () => {
    render(
      <NavigationGuard when>
        <button type="button">保存</button>
      </NavigationGuard>,
    );

    await userEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("中クリックは別タブで開く操作なので傍受しない", async () => {
    render(<GuardFixture />);

    await userEvent.pointer({
      target: screen.getByRole("link", { name: "設定" }),
      keys: "[MouseMiddle]",
    });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("外側で既に止められた click は二重に扱わない", async () => {
    render(
      <div onClickCapture={preventDefault}>
        <NavigationGuard when>
          <Link href="/settings">設定</Link>
        </NavigationGuard>
      </div>,
    );

    await userEvent.click(screen.getByRole("link", { name: "設定" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    render(<GuardFixture />);
    await userEvent.click(screen.getByRole("link", { name: "設定" }));

    const result = await axe(screen.getByRole("alertdialog"), {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });

  it("包んだ箱をレイアウトに参加させない", () => {
    // 見張るために置いた器が中身の配置を動かすと、包む範囲を広げるたびに画面が動く。
    const { container } = render(
      <NavigationGuard description="説明" title="題" when={true}>
        <p>中身</p>
      </NavigationGuard>,
    );

    expect(container.querySelector('[data-slot="navigation-guard"]')).toHaveClass("contents");
  });

  it("確認の文言を呼び出し元が差し替えられる", async () => {
    render(
      <NavigationGuard
        cancelLabel="編集を続ける"
        confirmLabel="破棄して移動"
        description="下書きは保存されません。"
        title="下書きが残っています"
        when
      >
        <Link href="/settings">設定</Link>
      </NavigationGuard>,
    );
    await userEvent.click(screen.getByRole("link", { name: "設定" }));

    expect(screen.getByRole("alertdialog", { name: "下書きが残っています" })).toBeInTheDocument();
    expect(screen.getByText("下書きは保存されません。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "破棄して移動" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "編集を続ける" })).toBeInTheDocument();
  });
});

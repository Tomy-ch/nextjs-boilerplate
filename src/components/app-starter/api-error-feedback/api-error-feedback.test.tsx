// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import { ApiErrorAlert, ApiErrorDialog } from "./api-error-feedback";

const noop = () => undefined;

describe("ApiErrorAlert", () => {
  it("API error と retry を表示する", () => {
    render(
      <ApiErrorAlert error={{ kind: "server", message: "失敗", retryable: true }} onRetry={noop} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("失敗");
    expect(screen.getByRole("button", { name: "再試行" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveClass("bg-destructive/10");
  });

  it("client error は warning として表示する", () => {
    render(<ApiErrorAlert error={{ kind: "client", message: "入力を確認してください。" }} />);

    expect(screen.getByRole("alert")).toHaveClass("bg-warning/10");
  });

  it("retryAfter と retryPending、補助操作を表示する", () => {
    render(
      <ApiErrorAlert
        error={{ kind: "server", message: "混雑しています。", retryAfter: 30, retryable: true }}
        onRetry={noop}
        retryPending
      >
        <Link href="/signin">ログイン</Link>
      </ApiErrorAlert>,
    );

    expect(screen.getByText("再試行可能まで約 30 秒")).toBeVisible();
    expect(screen.getByRole("button", { name: "再試行中…" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "ログイン" })).toBeVisible();
  });

  it("requestId を問い合わせ用に表示する", () => {
    render(<ApiErrorAlert error={{ kind: "server", message: "失敗", requestId: "req_01HZY" }} />);

    expect(screen.getByText("問い合わせ ID: req_01HZY")).toBeVisible();
  });
});

describe("ApiErrorDialog", () => {
  it("操作停止の失敗と再試行を表示する", () => {
    render(
      <ApiErrorDialog
        error={{ kind: "network", message: "通信を確認してください。", retryable: true }}
        onOpenChange={noop}
        onRetry={noop}
        open
      />,
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent("通信を確認してください。");
    expect(screen.getByRole("button", { name: "再試行" })).toBeVisible();
  });

  it("requestId と retryAfter、retryPending、補助操作を表示する", () => {
    render(
      <ApiErrorDialog
        error={{
          kind: "server",
          message: "混雑しています。",
          requestId: "req_01J0A",
          retryAfter: 30,
          retryable: true,
        }}
        onOpenChange={noop}
        onRetry={noop}
        open
        retryPending
      >
        <Link href="/signin">ログイン</Link>
      </ApiErrorDialog>,
    );

    expect(screen.getByText("問い合わせ ID: req_01J0A")).toBeVisible();
    expect(screen.getByText("再試行可能まで約 30 秒")).toBeVisible();
    expect(screen.getByRole("button", { name: "再試行中…" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "ログイン" })).toBeVisible();
  });

  it("再試行できない失敗では再試行ボタンを出さない", () => {
    render(
      <ApiErrorDialog
        error={{ kind: "client", message: "入力を確認してください。" }}
        onOpenChange={noop}
        open
      />,
    );

    expect(screen.getByRole("alertdialog")).toHaveTextContent("入力を確認してください。");
    expect(screen.queryByRole("button", { name: "再試行" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "閉じる" })).toBeVisible();
  });
});

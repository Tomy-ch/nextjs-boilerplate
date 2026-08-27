import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import type { ComponentProps } from "react";
import { type ApiError, ApiErrorAlert, ApiErrorDialog } from "./api-error-feedback";

type StoryArgs = Omit<ComponentProps<typeof ApiErrorAlert>, "error"> & {
  error: ApiError;
  requestId?: string;
};

const meta = {
  title: "Feedback/ApiErrorFeedback",
  component: ApiErrorAlert,
  parameters: { layout: "centered", docs: { story: { inline: false, iframeHeight: 420 } } },
  render: ({ requestId, error, ...props }) => (
    <ApiErrorAlert {...props} error={{ ...error, requestId }} />
  ),
} satisfies Meta<StoryArgs>;
export default meta;
type Story = StoryObj<typeof meta>;
const noop = () => undefined;
export const ClientError: Story = {
  args: {
    error: { kind: "client", message: "入力内容を確認してください。" },
    requestId: "req_warning_demo",
  },
  parameters: {
    docs: {
      description: { story: "warning 表示。requestId は Controls から変更できます。" },
    },
  },
};
export const ServerError: Story = {
  args: {
    error: {
      kind: "server",
      message: "時間をおいて再試行してください。",
      retryAfter: 30,
      retryable: true,
    },
    onRetry: noop,
  },
};

export const ServerErrorWithoutRetry: Story = {
  args: {
    error: { kind: "server", message: "現在は再試行できません。", retryable: false },
    requestId: "req_server_no_retry",
  },
  parameters: {
    docs: { description: { story: "request ID はあるが、再試行操作を提供しない 5xx 相当。" } },
  },
};

export const RetryPending: Story = {
  args: {
    error: { kind: "server", message: "再試行しています。", retryable: true },
    retryPending: true,
    onRetry: noop,
  },
  parameters: {
    docs: { description: { story: "再試行中の二重送信を防ぐ状態。" } },
  },
};

export const BlockingDialog: Story = {
  args: { error: { kind: "network", message: "通信エラー" } },
  render: () => (
    <ApiErrorDialog
      error={{
        kind: "network",
        message: "通信を確認してから、もう一度お試しください。",
        retryable: true,
      }}
      onOpenChange={noop}
      onRetry={noop}
      open
    />
  ),
  parameters: {
    docs: {
      description: { story: "サーバーへ到達できず request ID がない場合の操作停止 Dialog。" },
    },
  },
};

export const BlockingDialogWithoutRetry: Story = {
  args: { error: { kind: "server", message: "処理を続けられません。" } },
  render: () => (
    <ApiErrorDialog
      error={{
        kind: "server",
        message: "処理を続けられません。時間をおいて再度お試しください。",
        requestId: "req_blocked_demo",
      }}
      onOpenChange={noop}
      open
    />
  ),
  parameters: {
    docs: {
      description: { story: "再試行操作を提供しない server error。request ID を表示する。" },
    },
  },
};

export const BlockingDialogRetryPending: Story = {
  args: { error: { kind: "network", message: "再接続しています。" } },
  render: () => (
    <ApiErrorDialog
      error={{ kind: "network", message: "再接続しています。", retryable: true }}
      onOpenChange={noop}
      onRetry={noop}
      open
      retryPending
    />
  ),
  parameters: {
    docs: { description: { story: "再試行中は二重送信を防ぎ、ボタンを disabled にする。" } },
  },
};

export const BlockingDialogWithAction: Story = {
  args: { error: { kind: "client", message: "この操作にはログインが必要です。" } },
  render: () => (
    <ApiErrorDialog
      error={{ kind: "client", message: "この操作にはログインが必要です。" }}
      onOpenChange={noop}
      open
    >
      <Link href="/signin">ログイン</Link>
    </ApiErrorDialog>
  ),
  parameters: {
    docs: { description: { story: "feature 固有のログイン導線を補助操作として合成する。" } },
  },
};

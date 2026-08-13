import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import { Button } from "@/components/design-system/action/button/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/design-system/overlay/alert-dialog/alert-dialog";
import { AuthSignInAction, AuthStateFeedback } from "./auth-state-feedback";
import { AUTH_STATE, AUTH_STATE_MESSAGE } from "./auth-state-feedback.definition";

const meta = {
  title: "Feedback/AuthStateFeedback",
  component: AuthStateFeedback,
  parameters: { layout: "centered", docs: { story: { inline: false, iframeHeight: 420 } } },
  args: { state: AUTH_STATE.UNAUTHENTICATED },
} satisfies Meta<typeof AuthStateFeedback>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Unauthenticated: Story = {
  args: {
    state: AUTH_STATE.UNAUTHENTICATED,
    children: <AuthSignInAction href="/api/auth/login?returnUrl=%2Fplans" />,
  },
  parameters: {
    docs: {
      description: {
        story:
          "401。サインインの開始は Route Handler から IdP への redirect なので、導線は document 遷移になる。",
      },
    },
  },
};

export const SessionExpired: Story = {
  args: {
    state: AUTH_STATE.SESSION_EXPIRED,
    children: <AuthSignInAction href="/api/auth/login?returnUrl=%2Fplans%2F42%2Fedit" />,
  },
  parameters: {
    docs: {
      description: {
        story: "同じ 401 でも、一度サインインしていた人には失われるものを伝える。",
      },
    },
  },
};

export const Forbidden: Story = {
  args: {
    state: AUTH_STATE.FORBIDDEN,
    children: (
      <Button asChild variant="outline">
        <Link href="/plans">一覧へ戻る</Link>
      </Button>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "403。サインインし直しても解決しないため、導線はアプリ内の戻り先になる。ここだけ warning で示す。",
      },
    },
  },
};

export const NotFound: Story = {
  args: {
    state: AUTH_STATE.NOT_FOUND,
    children: (
      <Button asChild variant="outline">
        <Link href="/plans">一覧へ戻る</Link>
      </Button>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "404。権限の無い資源の存在を伏せる運用では、403 の代わりにこれが返る。",
      },
    },
  },
};

export const CustomMessage: Story = {
  args: {
    state: AUTH_STATE.FORBIDDEN,
    title: "この情報を表示できません",
    description: "この内容を見るには、管理者の権限が必要です。",
    children: (
      <Button asChild variant="outline">
        <Link href="/plans">一覧へ戻る</Link>
      </Button>
    ),
  },
  parameters: {
    docs: {
      description: { story: "何の権限が足りないかを言えるなら、既定の文言より具体的に書く。" },
    },
  },
};

export const BlockingDialog: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "操作の途中で session が切れた場合。overlay は呼び出し元が組み立て、この部品の文言だけを使う。",
      },
    },
  },
  render: () => (
    <AlertDialog defaultOpen>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {AUTH_STATE_MESSAGE[AUTH_STATE.SESSION_EXPIRED].title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {AUTH_STATE_MESSAGE[AUTH_STATE.SESSION_EXPIRED].description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>閉じる</AlertDialogCancel>
          <AuthSignInAction href="/api/auth/login?returnUrl=%2Fplans%2F42%2Fedit" />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

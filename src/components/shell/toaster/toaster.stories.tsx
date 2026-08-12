import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useRef } from "react";

import { Button } from "@/components/design-system/action/button/button";

import { Toaster, ToastProvider, useToast } from "./toaster";
import { TOAST_POSITION, TOAST_VARIANT } from "./toaster.definition";

const meta = {
  title: "Feedback/Toaster",
  component: Toaster,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "redirect しない mutation の結果を、一時的な通知として画面の隅へ積みます。",
          "**消えても困らない結果にだけ使います。** 利用者が対処しなければならない失敗や、",
          "後から読み返す必要がある内容は、画面内に残る `Alert` / `FormFeedback` で伝えます。",
          "`variant` は結果の種類を表し、文言と必ず対応させます。",
          "通知の内容と、いつ出すかは呼び出し元が決めます。この component が持つのは queue・",
          "表示位置・計時・払いのけです。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof Toaster>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。成功した結果を伝える。 */
export const Default: Story = {
  args: { toasts: [{ description: "変更を反映しました。", id: "success", title: "保存しました" }] },
};

/** 一部だけ通った場合。失敗ではないが、そのままにはできない状態を示す。 */
export const Warning: Story = {
  args: {
    toasts: [
      {
        description: "一部の項目は反映されていません。",
        id: "warning",
        title: "一部だけ保存しました",
        variant: TOAST_VARIANT.WARNING,
      },
    ],
  },
};

/** 失敗した場合。対処が要る失敗は、通知だけで済ませず画面内にも残す。 */
export const Destructive: Story = {
  args: {
    toasts: [
      {
        description: "時間をおいて再試行してください。",
        id: "error",
        title: "処理に失敗しました",
        variant: TOAST_VARIANT.DESTRUCTIVE,
      },
    ],
  },
};

/**
 * 表示時間を指定した場合。既定では自動で閉じないため、閉じてよい通知にだけ `duration` を渡す。
 */
export const AutoClose: Story = {
  args: {
    toasts: [
      {
        description: "この通知は時間経過で閉じます。",
        duration: 5000,
        id: "auto-close",
        title: "自動で閉じる通知",
      },
    ],
  },
};

/** 通知から直接実行できる操作を添えた場合。選ぶと処理を実行して閉じる。 */
export const WithAction: Story = {
  args: {
    toasts: [
      {
        action: { label: "元に戻す", onClick: () => {} },
        description: "取り消せます。",
        duration: 8000,
        id: "with-action",
        title: "削除しました",
      },
    ],
  },
};

const STACKED_TOASTS = [
  { id: "1", title: "一件目の通知" },
  { id: "2", title: "二件目の通知" },
  { id: "3", title: "三件目の通知" },
];

/**
 * 複数あるときの既定。重ねて畳み、hover するか領域内へ focus が入ると展開する。
 * `Alt` + `T` で領域へ focus を移せる。
 */
export const Collapsed: Story = { args: { toasts: STACKED_TOASTS } };

/** `expand` を指定した場合。畳まずに常に並べる。 */
export const Expanded: Story = { args: { expand: true, toasts: STACKED_TOASTS } };

/** 画面の上端中央へ積む場合。払いのける向きは積んだ隅に合わせて上向きになる。 */
export const TopCenter: Story = {
  args: { position: TOAST_POSITION.TOP_CENTER, toasts: STACKED_TOASTS },
};

/** 画面の左下へ積む場合。払いのける向きは左と下になる。 */
export const BottomLeft: Story = {
  args: { position: TOAST_POSITION.BOTTOM_LEFT, toasts: STACKED_TOASTS },
};

/** 上限を超えた通知は表示せず、表示中のものが閉じてから現れる。 */
export const VisibleLimit: Story = {
  args: {
    toasts: [
      { id: "1", title: "一件目" },
      { id: "2", title: "二件目" },
      { id: "3", title: "三件目" },
      { id: "4", title: "四件目（上限を超えるため表示されない）" },
    ],
    visibleToasts: 3,
  },
};

function ImperativeFixture() {
  const { toast } = useToast();
  const notifySuccess = useCallback(() => {
    toast({ description: "変更を反映しました。", duration: 5000, title: "保存しました" });
  }, [toast]);
  const notifyFailure = useCallback(() => {
    toast({
      action: { label: "再試行", onClick: () => {} },
      description: "時間をおいて再試行してください。",
      title: "処理に失敗しました",
      variant: TOAST_VARIANT.DESTRUCTIVE,
    });
  }, [toast]);

  return (
    <div className="flex gap-2 p-8">
      <Button onClick={notifySuccess} type="button" variant="outline">
        成功を通知
      </Button>
      <Button onClick={notifyFailure} type="button" variant="outline">
        失敗を通知
      </Button>
    </div>
  );
}

/**
 * `ToastProvider` を置いた場合。呼び出し側は queue の state も dismiss の配線も持たず、
 * `useToast()` の `toast()` を呼ぶだけで通知が出る。上限を超えた分は表示されない。
 */
export const WithProvider: Story = {
  args: { toasts: [] },
  render: () => (
    <ToastProvider>
      <ImperativeFixture />
    </ToastProvider>
  ),
};

function VisibleLimitFixture() {
  const { toast, visibleToasts, setVisibleToasts } = useToast();
  const countRef = useRef(0);
  const notify = useCallback(() => {
    countRef.current += 1;
    toast({ title: `${countRef.current} 件目の通知` });
  }, [toast]);
  const widen = useCallback(() => {
    setVisibleToasts(visibleToasts + 1);
  }, [setVisibleToasts, visibleToasts]);
  const narrow = useCallback(() => {
    setVisibleToasts(Math.max(0, visibleToasts - 1));
  }, [setVisibleToasts, visibleToasts]);

  return (
    <div className="flex items-center gap-2 p-8">
      <Button onClick={notify} type="button" variant="outline">
        通知を足す
      </Button>
      <Button onClick={narrow} type="button" variant="outline">
        上限を減らす
      </Button>
      <Button onClick={widen} type="button" variant="outline">
        上限を増やす
      </Button>
      <span className="text-sm text-muted-foreground">現在の上限: {visibleToasts}</span>
    </div>
  );
}

/**
 * 上限を実行時に変える場合。`useToast()` の `setVisibleToasts` で増減でき、広げると
 * 控えていた通知がそのまま現れる。一時的に広げたら元へ戻すのは呼び出し元の責務。
 */
export const RuntimeVisibleLimit: Story = {
  args: { toasts: [] },
  render: () => (
    <ToastProvider defaultVisibleToasts={1}>
      <VisibleLimitFixture />
    </ToastProvider>
  ),
};

function UpdateFixture() {
  const { toast, update } = useToast();
  const idRef = useRef("");
  const start = useCallback(() => {
    idRef.current = toast({ description: "しばらくお待ちください。", title: "処理中です" });
  }, [toast]);
  const succeed = useCallback(() => {
    update(idRef.current, {
      description: "変更を反映しました。",
      duration: 5000,
      title: "完了しました",
    });
  }, [update]);
  const fail = useCallback(() => {
    update(idRef.current, {
      action: { label: "再試行", onClick: () => {} },
      description: "時間をおいて再試行してください。",
      title: "処理に失敗しました",
      variant: TOAST_VARIANT.DESTRUCTIVE,
    });
  }, [update]);

  return (
    <div className="flex gap-2 p-8">
      <Button onClick={start} type="button" variant="outline">
        処理を始める
      </Button>
      <Button onClick={succeed} type="button" variant="outline">
        完了へ差し替える
      </Button>
      <Button onClick={fail} type="button" variant="outline">
        失敗へ差し替える
      </Button>
    </div>
  );
}

/**
 * 表示中の通知を差し替える場合。処理中の通知を、同じ場所のまま完了や失敗へ変えられる。
 * 閉じたあとに差し替えても何も起きない。
 */
export const RuntimeUpdate: Story = {
  args: { toasts: [] },
  render: () => (
    <ToastProvider>
      <UpdateFixture />
    </ToastProvider>
  ),
};

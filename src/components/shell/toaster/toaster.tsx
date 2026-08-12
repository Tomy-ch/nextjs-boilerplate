"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ToastRegion } from "./toast-region";
import {
  DEFAULT_TOAST_HOTKEY,
  DEFAULT_TOAST_POSITION,
  DEFAULT_VISIBLE_TOASTS,
  type Toast,
  type ToastHotkey,
  type ToastPatch,
  type ToastPosition,
} from "./toaster.definition";

export type {
  Toast,
  ToastAction,
  ToastPatch,
  ToastPosition,
  ToastVariant,
} from "./toaster.definition";

/** 通知の見せ方。`Toaster` と `ToastProvider` で共通する。 */
type ToastAppearance = {
  /** 積む隅。既定は {@link DEFAULT_TOAST_POSITION}。 */
  position?: ToastPosition;
  /** 常に展開して並べるか。既定では畳み、hover / focus で展開する。 */
  expand?: boolean;
  /** 領域へ focus を移すキー操作。既定は {@link DEFAULT_TOAST_HOTKEY}（Alt + T）。 */
  hotkey?: ToastHotkey;
  /** 領域のアクセシブルな名前。 */
  label?: string;
};

const DEFAULT_REGION_LABEL = "通知";

/**
 * redirect しない mutation の結果を、画面の隅へ重ねて知らせる横断通知。
 *
 * @remarks
 * queue は保持せず、渡された配列の先頭から `visibleToasts` 件までを並べる。追加・削除・自動で
 * 閉じた後の除去は `onDismiss` を受けた呼び出し元が行う。queue の保持ごと任せる場合は
 * {@link ToastProvider} を使う。
 *
 * 文脈内で示すべき失敗の置き換えには使わない。入力の誤りは field のエラー、操作対象の近くで
 * 説明すべき失敗は `Alert` や `FormFeedback` を使う。
 *
 * @example
 * ```tsx
 * "use client";
 *
 * const [toasts, setToasts] = useState<Toast[]>([]);
 * const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));
 *
 * <Toaster onDismiss={dismiss} toasts={toasts} />
 * ```
 *
 * @param props.toasts - 表示する通知の配列。先頭が最も新しい。
 * @param props.onDismiss - 通知が閉じられたときに、その `id` を受け取る callback。
 *   自動で閉じた場合も呼ばれる。省略すると閉じる操作を提供しない。
 * @param props.visibleToasts - 同時に表示する上限。既定は {@link DEFAULT_VISIBLE_TOASTS}。
 *   超えた分は表示せず、表示中の通知が閉じると現れる。0 以下を渡すと何も表示しない。
 *
 * @see Storybook `Feedback/Toaster`
 */
export function Toaster({
  toasts,
  onDismiss,
  visibleToasts = DEFAULT_VISIBLE_TOASTS,
  position = DEFAULT_TOAST_POSITION,
  expand = false,
  hotkey = DEFAULT_TOAST_HOTKEY,
  label = DEFAULT_REGION_LABEL,
}: {
  toasts: Toast[];
  onDismiss?: (id: string) => void;
  visibleToasts?: number;
} & ToastAppearance) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const dismiss = useCallback(
    (id: string) => {
      setDismissedIds((current) => new Set(current).add(id));
      onDismiss?.(id);
    },
    [onDismiss],
  );

  const currentIds = useMemo(() => new Set(toasts.map((toast) => toast.id)), [toasts]);

  // 呼び出し元が queue から外した id を抑制対象からも落とす。積みっぱなしにすると、
  // 対象ごとに id を採る呼び出し元（同じ対象で再び失敗したら同じ id）では、二度目の
  // 通知が二度と出せなくなる。
  useEffect(() => {
    // queue から外れたことの検出は「消えた」という遷移の観測で、現時点ではこの effect でしか
    // 取れていない。
    // TODO: dismiss の遷移を導出で表せるか（抑制対象を id ではなく通知の世代で持つ等）を #169 で見る
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 遷移の観測のため
    setDismissedIds((current) => {
      const next = new Set([...current].filter((id) => currentIds.has(id)));

      return next.size === current.size ? current : next;
    });
  }, [currentIds]);

  const visible = toasts
    .filter((toast) => !dismissedIds.has(toast.id))
    .slice(0, Math.max(0, visibleToasts));

  return (
    <ToastRegion
      expand={expand}
      hotkey={hotkey}
      label={label}
      onDismiss={dismiss}
      position={position}
      toasts={visible}
    />
  );
}

/** {@link useToast} が返す操作。 */
export type ToastControls = {
  /** 通知を 1 件出し、その `id` を返す。 */
  toast: (toast: Omit<Toast, "id">) => string;
  /**
   * 表示中の通知を差し替える。
   *
   * @remarks
   * 処理中の通知を完了や失敗へ変える場合に使う。すでに閉じられた `id` を渡しても何も起きない。
   */
  update: (id: string, patch: ToastPatch) => void;
  /** `id` を指定して通知を取り除く。 */
  dismiss: (id: string) => void;
  /** 現在の同時表示上限。 */
  visibleToasts: number;
  /**
   * 同時表示上限を変える。
   *
   * @remarks
   * 一時的に広げた場合は、その画面を離れるときに元へ戻すのは呼び出し元の責務である。
   * 戻さないと、以後すべての画面がその上限で表示され続ける。既定値は
   * {@link DEFAULT_VISIBLE_TOASTS}。
   */
  setVisibleToasts: (visibleToasts: number) => void;
};

const ToastContext = createContext<ToastControls | undefined>(undefined);

/**
 * 通知 queue を保持し、配下のどこからでも通知を出せるようにする Provider。
 *
 * @remarks
 * これを置くと、通知を出す側は queue の state も dismiss の配線も持たなくてよくなる。
 * root layout から一度だけ mount する。二重に置くと queue が分かれ、上限の意味が失われる。
 *
 * Provider 自身が `Toaster` を描画するため、`Toaster` を別途置く必要はない。
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * <ToastProvider>{children}</ToastProvider>
 *
 * // 任意の Client Component
 * const { toast } = useToast();
 * toast({ title: "保存しました", duration: 5000 });
 * ```
 *
 * @param props.children - 通知を出せる範囲。
 * @param props.defaultVisibleToasts - 同時に表示する上限の初期値。既定は
 *   {@link DEFAULT_VISIBLE_TOASTS}。以後は `useToast()` の `setVisibleToasts` で変えられる。
 *
 * @see Storybook `Feedback/Toaster`
 */
export function ToastProvider({
  children,
  defaultVisibleToasts = DEFAULT_VISIBLE_TOASTS,
  position = DEFAULT_TOAST_POSITION,
  expand = false,
  hotkey = DEFAULT_TOAST_HOTKEY,
  label = DEFAULT_REGION_LABEL,
}: {
  children?: ReactNode;
  defaultVisibleToasts?: number;
} & ToastAppearance) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [visibleToasts, setVisibleToasts] = useState(defaultVisibleToasts);
  const nextIdRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const controls = useMemo<ToastControls>(
    () => ({
      dismiss,
      setVisibleToasts,
      toast: (toast) => {
        nextIdRef.current += 1;
        const id = `toast-${nextIdRef.current}`;
        setToasts((current) => [{ ...toast, id }, ...current]);
        return id;
      },
      update: (id, patch) => {
        setToasts((current) =>
          current.map((toast) => (toast.id === id ? { ...toast, ...patch, id } : toast)),
        );
      },
      visibleToasts,
    }),
    [dismiss, visibleToasts],
  );

  return (
    <ToastContext.Provider value={controls}>
      {children}
      <Toaster
        expand={expand}
        hotkey={hotkey}
        label={label}
        onDismiss={dismiss}
        position={position}
        toasts={toasts}
        visibleToasts={visibleToasts}
      />
    </ToastContext.Provider>
  );
}

/**
 * 配下から通知を出すための操作を取り出す。
 *
 * @remarks
 * {@link ToastProvider} の外で呼ぶと例外を投げる。通知は Provider が保持する queue へ入るため、
 * 呼び出し側は表示位置も閉じる操作も知らなくてよい。
 *
 * @throws Provider の外で呼ばれた場合。
 */
export function useToast(): ToastControls {
  const controls = useContext(ToastContext);
  if (controls === undefined) {
    throw new Error("useToast は ToastProvider の内側で呼ぶ必要があります。");
  }
  return controls;
}

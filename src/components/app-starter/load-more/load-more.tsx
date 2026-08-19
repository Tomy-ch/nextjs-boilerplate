import type { RefObject } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import { Spinner } from "@/components/design-system/status/spinner/spinner";

import type { LoadMoreState } from "./load-more.definition";

/** {@link LoadMore} の props。 */
export type LoadMoreProps = {
  /** 続きの読み込みの状態。 */
  state: LoadMoreState;
  /** 末尾到達を見張る目印を置く先。scroll で読み進める側が渡す。 */
  sentinelRef?: RefObject<HTMLDivElement | null>;
  /** 読み直す操作の名前。既定は「もう一度読み込む」。 */
  retryLabel?: string;
  /** 失敗したことを伝える文。既定は「続きを読み込めませんでした。」。 */
  failureMessage?: string;
  /** 取得中であることを読み上げへ伝える語。既定は「続きを読み込んでいます」。 */
  loadingLabel?: string;
};

/**
 * 増分取得の一覧の末尾に置く、続きの読み込みの状態。
 *
 * @remarks
 * **取得を持ちません。** 取得中・失敗・終端という 3 つの見え方を、状態を持たずに描き分けます。
 * 取得と末尾到達の検知は呼び出し元が持ちます。
 *
 * **続きを読む操作は失敗したときだけ出します。** 読み進めている間は末尾に近づくだけで次が
 * 始まるため、同じことをする入口を並べても選ぶ手数が増えるだけです。失敗した後だけは事情が
 * 違い、末尾到達の検知はその場に留まる限り二度と起きないので、操作が唯一の復帰口になります。
 *
 * この形でも scroll 以外の手段が失われないのは、keyboard の scroll も支援技術の読み進めも
 * 表示位置を動かし、末尾到達の検知はそれで発火するためです
 * （[0100](../../../../docs/adr/0100-accessibility-target.md)）。動かしても直らない失敗の
 * 場面にだけ操作を置くのは、この性質と表裏です。
 *
 * 終端では何も描きません。読み終えたことは一覧が尽きていることで伝わり、そこに空の枠が残ると
 * まだ続きがあるように読めます。
 *
 * 前後へ 1 ページずつ動く一覧には
 * [`CursorPagination`](../cursor-pagination/README.md) を使います。同じ cursor 方式でも、
 * こちらは**読み進めて積み増す**一覧のためのものです。
 *
 * @example
 * ```tsx
 * import { LoadMore } from "@/components/app-starter/load-more/load-more";
 *
 * <LoadMore sentinelRef={sentinelRef} state={{ status: "loading" }} />;
 * ```
 *
 * @param props.state - 続きの読み込みの状態。
 * @param props.sentinelRef - 末尾到達を見張る目印を置く先。
 * @param props.retryLabel - 読み直す操作の名前。
 * @param props.failureMessage - 失敗したことを伝える文。
 * @param props.loadingLabel - 取得中であることを読み上げへ伝える語。
 * @see Storybook `Navigation/LoadMore`
 */
export function LoadMore({
  state,
  sentinelRef,
  retryLabel = "もう一度読み込む",
  failureMessage = "続きを読み込めませんでした。",
  loadingLabel = "続きを読み込んでいます",
}: LoadMoreProps) {
  if (state.status === "exhausted") {
    return null;
  }

  return (
    <div className="flex min-h-12 flex-col items-center gap-3" ref={sentinelRef}>
      {state.status === "failed" ? (
        <>
          <p className="text-destructive text-sm">{failureMessage}</p>
          <Button onClick={state.onRetry} type="button" variant={BUTTON_VARIANT.OUTLINE}>
            {retryLabel}
          </Button>
        </>
      ) : null}
      {state.status === "loading" ? (
        <Spinner className="size-6 text-muted-foreground" label={loadingLabel} />
      ) : null}
    </div>
  );
}

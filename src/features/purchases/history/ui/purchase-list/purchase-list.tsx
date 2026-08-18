import type { RefObject } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import { Spinner } from "@/components/design-system/status/spinner/spinner";
import type { PurchaseHistoryEntry } from "@/model/purchase/purchase";

import { PurchaseRow } from "../purchase-row/purchase-row";

/**
 * 続きの読み込みが今どうなっているか。
 *
 * @remarks
 * 取得中・失敗・終端は同時に立ちません。真偽値を並べて表すと、両方が立った姿や、終端なのに
 * 失敗している姿まで型として通ります（[0029](../../../../../docs/adr/0029-type-design-discipline.md)）。
 *
 * 読み直す操作を `failed` だけが持つのは、それが唯一の復帰口だからです。渡し忘れた失敗という
 * 状態を書けなくしています。
 */
export type PurchaseLoadMoreState =
  /** 読み終えている。続きが無い。 */
  | { readonly status: "exhausted" }
  /** 続きがあり、末尾へ近づくのを待っている。 */
  | { readonly status: "idle" }
  /** 続きを取得している最中。 */
  | { readonly status: "loading" }
  /** 直前の取得に失敗した。 */
  | { readonly status: "failed"; readonly onRetry: () => void };

/** 一覧に並ぶ 1 件と、その詳細の行き先。 */
export type PurchaseListEntry = {
  readonly purchase: PurchaseHistoryEntry;
  readonly href: string;
};

/** `PurchaseLoadMoreList` の props。 */
export type PurchaseLoadMoreListProps = {
  /** 読み込み済みのすべての購入。 */
  entries: readonly PurchaseListEntry[];
  /** 続きの読み込みの状態。 */
  loadMore: PurchaseLoadMoreState;
  /** 末尾到達を見張る目印を置く先。scroll で読み進める側が渡す。 */
  sentinelRef?: RefObject<HTMLDivElement | null>;
};

/**
 * 読み進めた購入履歴の見た目。
 *
 * @remarks
 * 取得を持ちません。読み込み済みの件数・取得中・失敗・終端という 4 つの見え方を、状態を持たずに
 * 描き分けます。取得と末尾到達の検知は呼び出し元が持ちます。
 *
 * **続きを読む操作は失敗したときだけ出します。** 読み進めている間は末尾に近づくだけで次が
 * 始まるため、同じことをする入口を並べても選ぶ手数が増えるだけです。失敗した後だけは事情が
 * 違い、末尾到達の検知はその場に留まる限り二度と起きないので、操作が唯一の復帰口になります。
 *
 * 総数は出しません。契約が返すのは 1 ページと次の鍵だけで、期間で絞った結果が全部で何件あるかは
 * 読み終えるまで判りません（[0073](../../../../../docs/adr/0073-pagination-fetch-boundary.md)）。
 * 読み込んだ数を「全体の何件中」の形に見せると、実際には知らない数を知っているように読めます。
 *
 * 件数と読み込み状況を、それぞれ別に読み上げさせます。件数は結果そのもので、読み込み中は進行の
 * 報告なので、1 つの文へまとめると読み込みのたびに件数まで読み直されます。追加された購入は一覧の
 * 末尾に増えるだけなので、伝えないと画面を見ていない利用者には何も起きていないのと区別が付きません。
 */
export function PurchaseLoadMoreList({
  entries,
  loadMore,
  sentinelRef,
}: PurchaseLoadMoreListProps) {
  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {`${entries.length} 件を表示中`}
      </p>
      <ul className="divide-y rounded-lg border">
        {entries.map((entry) => (
          <PurchaseRow href={entry.href} key={entry.purchase.code} purchase={entry.purchase} />
        ))}
      </ul>
      {loadMore.status === "exhausted" ? null : (
        <div className="flex min-h-12 flex-col items-center gap-3" ref={sentinelRef}>
          {loadMore.status === "failed" ? (
            <>
              <p className="text-destructive text-sm">続きを読み込めませんでした。</p>
              <Button onClick={loadMore.onRetry} type="button" variant={BUTTON_VARIANT.OUTLINE}>
                もう一度読み込む
              </Button>
            </>
          ) : null}
          {loadMore.status === "loading" ? (
            <Spinner className="size-6 text-muted-foreground" label="続きを読み込んでいます" />
          ) : null}
        </div>
      )}
    </div>
  );
}

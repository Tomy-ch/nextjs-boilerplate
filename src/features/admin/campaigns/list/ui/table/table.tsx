"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/design-system/display/badge/badge";
import { rowActionsColumn } from "@/components/patterns/table/row-actions/row-actions";
import { ROW_ACTION_KIND } from "@/components/patterns/table/row-actions/row-actions.definition";
import {
  StaticDataTable,
  type StaticDataTableColumn,
} from "@/components/patterns/table/static-data/static-data";
import { formatNumber } from "@/model/number";

import type { AdminCampaignRow } from "../../row";

/**
 * 狭い段で伏せる列に付ける class。
 *
 * @remarks
 * 狭い段で残すのは **どれか（コード）・いまどうか（状態）・いくつ残っているか（残り枚数）・
 * 何ができるか（操作）** の 4 つです。
 */
const MEDIUM_UP = "hidden md:table-cell";

/**
 * 広い段でだけ出す列に付ける class。
 *
 * @remarks
 * 配るクーポンの有効期限と停止日時は、行を見比べるときの手がかりではなく 1 件を詳しく読むときの
 * 値です。脇の一覧が常設になる段では表の幅が足りず、日時が折り返して行の高さが揃いません。
 */
const WIDE_ONLY = "hidden xl:table-cell";

/** 値が無い欄に置く記号。 */
const NO_VALUE = "—";

/** `AdminCampaignTable` の props。 */
export type AdminCampaignTableProps = {
  /** 並べるキャンペーン。 */
  items: readonly AdminCampaignRow[];
  /** 停止する操作が選ばれたことを伝える。確認を出すのは呼び出し元。 */
  onSuspend: (campaign: AdminCampaignRow) => void;
  /** 一覧の下に置くページ送り。 */
  pagination?: ReactNode;
};

/**
 * 行の React key を組む。
 *
 * @param item - 対象の行
 * @returns 行の識別子
 */
function rowKey(item: AdminCampaignRow): string {
  return item.id;
}

/**
 * 残り枚数の欄。
 *
 * @remarks
 * **配りきった行は色だけで伝えません。** 「上限到達」の語を添え、色はそれを強めるだけです。
 *
 * @param item - 対象の行
 * @returns 残り枚数と総枚数
 */
function remainingCell(item: AdminCampaignRow): ReactNode {
  return (
    <span className="flex flex-col items-end tabular-nums">
      <span>
        {formatNumber(item.remaining)} / {formatNumber(item.totalLimit)}
      </span>
      {item.remaining === 0 ? (
        <span className="text-destructive text-xs font-emphasis">上限到達</span>
      ) : null}
    </span>
  );
}

/**
 * 表の列定義を組み立てる。
 *
 * @remarks
 * 列幅は `col` ではなく cell に持たせます。伏せた列の cell は描かれないため、`col` に幅を持たせると
 * 伏せた分だけ後ろの列と幅がずれます。
 *
 * @param onSuspend - 停止の操作が選ばれたときに呼ぶ
 * @returns 静的データ表へ渡す列定義
 */
function toColumns(
  onSuspend: (campaign: AdminCampaignRow) => void,
): readonly StaticDataTableColumn<AdminCampaignRow>[] {
  return [
    {
      id: "code",
      header: "コード",
      cellClassName: "break-all",
      cell: (item) => <span className="font-emphasis">{item.code}</span>,
    },
    {
      id: "status",
      header: "状態",
      headerClassName: "w-24",
      cell: (item) => <Badge variant={item.statusTone}>{item.statusName}</Badge>,
    },
    {
      id: "period",
      header: "配布期間",
      headerClassName: `${MEDIUM_UP} w-44`,
      cellClassName: MEDIUM_UP,
      cell: (item) => (
        <span className="flex flex-col tabular-nums">
          <span>{item.startsAt} 〜</span>
          <span>{item.endsAt}</span>
        </span>
      ),
    },
    {
      id: "remaining",
      header: "残り枚数",
      align: "end",
      headerClassName: "w-28",
      cell: remainingCell,
    },
    {
      id: "discount",
      header: "値引き",
      headerClassName: `${MEDIUM_UP} w-32`,
      cellClassName: MEDIUM_UP,
      cell: (item) => (
        <span className="flex flex-col">
          <span>{item.discount}</span>
          {item.discountCap === undefined ? null : (
            <span className="text-muted-foreground text-xs">{item.discountCap}</span>
          )}
        </span>
      ),
    },
    {
      id: "scope",
      header: "適用範囲",
      headerClassName: `${MEDIUM_UP} w-32`,
      cellClassName: MEDIUM_UP,
      cell: (item) => item.scopeName,
    },
    {
      id: "coupon-expires-at",
      header: "配るクーポンの有効期限",
      headerClassName: `${WIDE_ONLY} w-40`,
      cellClassName: `${WIDE_ONLY} tabular-nums`,
      cell: (item) => item.couponExpiresAt,
    },
    {
      id: "suspended-at",
      header: "停止日時",
      headerClassName: `${WIDE_ONLY} w-40`,
      cellClassName: `${WIDE_ONLY} tabular-nums`,
      cell: (item) => item.suspendedAt ?? NO_VALUE,
    },
    {
      ...rowActionsColumn<AdminCampaignRow>({
        triggerLabel: (item) => `${item.code} の操作`,
        // 空を返すと `RowActionsMenu` が trigger ごと描かない。
        actions: (item) =>
          item.suspendedAt !== null
            ? []
            : [
                {
                  id: "suspend",
                  kind: ROW_ACTION_KIND.COMMAND,
                  label: "停止する",
                  variant: "destructive",
                  onSelect: () => onSuspend(item),
                },
              ],
      }),
      width: undefined,
      headerClassName: "w-12",
      cellClassName: "relative",
    },
  ];
}

/**
 * 管理側のキャンペーン一覧。
 *
 * @remarks
 * 取得もページ送りの組み立ても持ちません。並べるキャンペーンと、下へ置くものを受け取るだけです。
 *
 * **確認を出すのはここではありません。** 停止は取り消せないので確認を挟みますが、確認の面と送信の
 * 結果は一覧の外側に居ます（[`SuspendableCampaignList`](../suspendable-list/suspendable-list.tsx)）。
 * 行が知っているのは「このキャンペーンに対して停止が選ばれた」ことだけです。
 *
 * **状態の色は行が持ち込みます**（`../../status-tone.ts`）。色は状態名に重ねているだけで、色だけで
 * 区別させません。
 *
 * @param props - {@link AdminCampaignTableProps} を参照。
 * @see Storybook `Features/Admin/Campaigns/List/Table`
 */
export function AdminCampaignTable({ items, onSuspend, pagination }: AdminCampaignTableProps) {
  return (
    <StaticDataTable
      columns={toColumns(onSuspend)}
      emptyMessage="キャンペーンはまだありません。"
      getRowKey={rowKey}
      label="キャンペーンの一覧"
      pagination={pagination}
      rows={items}
    />
  );
}

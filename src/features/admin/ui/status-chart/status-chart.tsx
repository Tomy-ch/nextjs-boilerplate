"use client";

import dynamic from "next/dynamic";

import type { PurchaseStatusCount } from "@/model/dashboard/dashboard";

/** `StatusChart` の props。 */
export type StatusChartProps = {
  /** 契約が返した順序のままのステータス別件数。 */
  counts: readonly PurchaseStatusCount[];
};

/**
 * 帯そのものは、この領域が画面に出てから読む。
 *
 * @remarks
 * 静的に import すると、作図の一式（recharts）が管理ダッシュボードの**最初の読み込み**に乗ります。
 * gzip で 93 KB あり、この画面が同梱サンプルで 2 番目に重い理由です
 * （[0101](../../../../../docs/adr/0101-performance-budget.md)）。
 *
 * **遅らせても伝わる内容が減りません。** 同じ数はすぐ隣の表が持っており、帯は大小を掴むための
 * 補助でしかないためです（`../status-breakdown/`）。
 */
const StatusBars = dynamic(
  () => import("../status-bars/status-bars").then((module) => module.StatusBars),
  { ssr: false, loading: () => <StatusBarsPlaceholder /> },
);

/**
 * 帯が読み込まれるまでの枠。
 *
 * @remarks
 * 出来上がりと同じ高さ（`h-56`）で置きます。届いた瞬間に隣の表や下の要素が動きません。
 */
function StatusBarsPlaceholder() {
  return <div aria-hidden="true" className="h-56 w-full" />;
}

/**
 * ステータス別件数の帯。
 *
 * @remarks
 * 描き方そのものは `../status-bars/` が持ちます。ここが持つのは**いつ読むか**だけで、分けて
 * あるのは `ssr: false` を書ける場所が client component に限られるためです。呼び出し元
 * （`../status-breakdown/`）は server component のまま置けます。
 *
 * @see Storybook `Page/Admin/Dashboard`
 */
export function StatusChart({ counts }: StatusChartProps) {
  return <StatusBars counts={counts} />;
}

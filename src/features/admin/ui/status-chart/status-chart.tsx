"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { useOnVisible } from "@/capabilities/use-on-visible";
import type { PurchaseStatusCount } from "@/model/dashboard/dashboard";

/** `StatusChart` の props。 */
export type StatusChartProps = {
  /** 契約が返した順序のままのステータス別件数。 */
  counts: readonly PurchaseStatusCount[];
};

/**
 * 帯そのものは、最初に読む一式から外す。
 *
 * @remarks
 * 静的に import すると、作図の一式（recharts）が管理ダッシュボードの**最初の読み込み**に乗ります。
 * 同梱サンプルの実測で gzip 93 KB、この画面で最も大きな一塊です（自動では検証されない目安）。
 * 何が得られて何が得られないかは
 * [0101](../../../../../docs/adr/0101-performance-budget.md) §4。
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
 * **読むのは帯が近づいてからです。** `dynamic` が遅らせるのは初期の一式に載せるかどうかで、
 * 描画され次第そのまま取得と評価が走ります。読み込みの最中に走れば main thread を塞ぎ、
 * TBT に乗ります —— 実測でこの画面だけが recharts を読み、167 ms の長いタスクを 1 本作って
 * いました（他の画面は 34〜83 ms）。`dynamic` だけでは初期バンドルの大きさにしか効きません。
 *
 * 手前の距離を置くのは、見えてから読み始めると帯が出るまでの間が空くためです。読み込みを
 * 始める判断だけを前倒しし、出来上がりの位置と高さは変えません。
 *
 * @see Storybook `Page/Admin/Dashboard`
 */
export function StatusChart({ counts }: StatusChartProps) {
  const [reached, setReached] = useState(false);
  const ref = useOnVisible(() => setReached(true), { rootMargin: "200px" });

  return (
    <div ref={ref}>{reached ? <StatusBars counts={counts} /> : <StatusBarsPlaceholder />}</div>
  );
}

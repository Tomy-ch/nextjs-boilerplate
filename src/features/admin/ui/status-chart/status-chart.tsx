"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

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
 * **読むのは、ブラウザが手空きになってからです。** `dynamic` が遅らせるのは初期の一式へ載せるか
 * どうかで、描画され次第そのまま取得と評価が走ります（[0101](../../../../../docs/adr/0101-performance-budget.md) §4）。
 * 読み込みの最中に走れば main thread を塞ぎ、TBT に乗ります —— 実測でこの画面と集計の画面だけが
 * recharts を読み、予算 200 ms に対して両方が縁にいました。
 *
 * **見えたかどうかでは足りません。** 計測の viewport（412×823）では帯が折り返しの内側に来るため、
 * 交差は最初から起きています。同じ理由で、実際の利用でも「開いたら見えている」ことが多い面です。
 *
 * 手空きを待つ形にすると、**出来上がりは変わらないまま**、帯の評価が最初の描画の後ろへ回ります。
 * 同じ画面の編集面（`admin/products`）が操作まで mount しないのと同じ考え方で、あちらは遅延
 * 187 KB を持ちながら TBT 67 ms です。
 *
 * @see Storybook `Page/Admin/Dashboard`
 */
export function StatusChart({ counts }: StatusChartProps) {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    // `requestIdleCallback` を持たないブラウザでは、次の tick へ回すだけに留める。
    // 待つ長さではなく「最初の描画の後ろへ回す」ことが目的なので、これで足りる。
    if (typeof requestIdleCallback !== "function") {
      const timer = setTimeout(() => setSettled(true));

      return () => clearTimeout(timer);
    }

    const handle = requestIdleCallback(() => setSettled(true));

    return () => cancelIdleCallback(handle);
  }, []);

  return settled ? <StatusBars counts={counts} /> : <StatusBarsPlaceholder />;
}

"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer } from "@/components/design-system/display/chart/chart";
import type { PurchaseStatusCount } from "@/model/dashboard/dashboard";

/** `StatusChart` の props。 */
export type StatusChartProps = {
  /** 契約が返した順序のままのステータス別件数。 */
  counts: readonly PurchaseStatusCount[];
};

const CHART_CONFIG = {
  count: { label: "件数", color: "var(--semantic-color-primary)" },
} satisfies ChartConfig;

/**
 * ステータス別件数を横棒で並べる。
 *
 * @remarks
 * **これは補助であって、唯一の伝達手段ではありません。** 同じ内容は隣の表が数で持ちます
 * （`../status-breakdown/`）。形と色でしか読めない情報をここに置きません
 * （[0100](../../../../../docs/adr/0100-accessibility-target.md)）。
 *
 * **tooltip も凡例も置きません。** tooltip は pointer を合わせている間だけ現れるため touch と
 * keyboard から到達できず、凡例は系列が 1 本しかない場では色の対応を説明する相手がいません。
 * 数を読む手段は表の側にあります。
 *
 * **横棒にしています。** 並ぶのはステータス名という長さのまちまちな文字列で、縦棒にすると
 * 軸の目盛りが回転するか省略されます。横棒なら名前は行として読めます。
 *
 * **登場の動きを止めています。** 帯は幅 0 から伸びる動きを持ちますが、伸びきる前の姿も
 * 「その件数の帯」として読めてしまいます。止めれば基準画像も撮った時点に依存しません
 * （[0051](../../../../../docs/adr/0051-styling-system.md) §3）。
 *
 * recharts が描画に実寸を要するため client island です
 * （[0040](../../../../../docs/adr/0040-routing-rendering-strategy.md)）。取得も並べ替えも
 * 持たず、渡された配列をそのまま描きます。
 *
 * @see Storybook `Page/Admin/Dashboard`
 */
export function StatusChart({ counts }: StatusChartProps) {
  return (
    <ChartContainer className="aspect-auto h-56 w-full" config={CHART_CONFIG}>
      <BarChart
        accessibilityLayer
        data={[...counts]}
        layout="vertical"
        margin={{ left: 8 }}
        // 帯の太さは行数で決まる。上限が無いと、ステータスが 1 つだけの期間で 1 本が枠を埋める。
        maxBarSize={28}
      >
        <XAxis
          axisLine={false}
          // 件数は整数しか取らない。既定の目盛りは小数を刻むことがある。
          allowDecimals={false}
          tickLine={false}
          type="number"
        />
        <YAxis
          axisLine={false}
          dataKey="statusName"
          tickLine={false}
          tickMargin={8}
          type="category"
          width={80}
        />
        <Bar dataKey="count" fill="var(--color-count)" isAnimationActive={false} radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

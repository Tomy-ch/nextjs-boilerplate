import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table/table";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "./chart";
import { CHART_INDICATOR } from "./chart.definition";

type Point = { period: string; opened: number; closed: number };

const data: readonly Point[] = [
  { period: "1 月", opened: 186, closed: 80 },
  { period: "2 月", opened: 305, closed: 200 },
  { period: "3 月", opened: 237, closed: 120 },
  { period: "4 月", opened: 273, closed: 190 },
  { period: "5 月", opened: 209, closed: 130 },
];

const config = {
  opened: { label: "受付", color: "var(--color-foreground)" },
  closed: { label: "完了", color: "var(--color-muted-foreground)" },
} satisfies ChartConfig;

function DataTable() {
  return (
    <Table label="受付と完了の推移">
      <TableHeader>
        <TableRow>
          <TableHead>期間</TableHead>
          <TableHead>受付</TableHead>
          <TableHead>完了</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((point) => (
          <TableRow key={point.period}>
            <TableCell>{point.period}</TableCell>
            <TableCell>{point.opened}</TableCell>
            <TableCell>{point.closed}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BarChartFixture({
  indicator,
}: {
  indicator?: (typeof CHART_INDICATOR)[keyof typeof CHART_INDICATOR];
}) {
  return (
    <ChartContainer config={config}>
      <BarChart accessibilityLayer data={[...data]}>
        <CartesianGrid vertical={false} />
        <XAxis axisLine={false} dataKey="period" tickLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent indicator={indicator} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="opened" fill="var(--color-opened)" radius={4} />
        <Bar dataKey="closed" fill="var(--color-closed)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

function LineChartFixture() {
  return (
    <ChartContainer config={config}>
      <LineChart accessibilityLayer data={[...data]}>
        <CartesianGrid vertical={false} />
        <XAxis axisLine={false} dataKey="period" tickLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent indicator={CHART_INDICATOR.LINE} />} />
        <Line dataKey="opened" dot={false} stroke="var(--color-opened)" type="monotone" />
      </LineChart>
    </ChartContainer>
  );
}

function ChartWithTable() {
  return (
    <div className="flex flex-col gap-6">
      <BarChartFixture />
      <DataTable />
    </div>
  );
}

const meta = {
  title: "Display/Chart",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "recharts に系列定義と配色を与える枠です。データの取得と集計は持たず、描画に必要な形へ",
          "整えた配列を呼び出し元が渡します。chart は形と色で情報を伝えるため、同じ内容へ到達できる",
          "数値表や要約を必ず併置します。`WithDataTable` がその構成です。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[36rem] max-w-[calc(100vw-2rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** 複数系列の棒グラフ。tooltip と凡例を合成する。 */
export const Default: Story = { render: () => <BarChartFixture /> };

/** 折れ線で推移を示す場合。tooltip の印は `line` にする。 */
export const AsLine: Story = { render: () => <LineChartFixture /> };

/** tooltip の印を破線にする場合。 */
export const DashedIndicator: Story = {
  render: () => <BarChartFixture indicator={CHART_INDICATOR.DASHED} />,
};

/** 同じ内容へ到達できる数値表を併置する構成。chart を唯一の伝達手段にしない。 */
export const WithDataTable: Story = { render: () => <ChartWithTable /> };

import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Input } from "@/components/design-system/form/input/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/design-system/navigation/pagination/pagination";
import { StaticDataTable, type StaticDataTableColumn } from "./static-data";

type StatusRow = { id: string; name: string; status: string };
const columns: readonly StaticDataTableColumn<StatusRow>[] = [
  { id: "name", header: "項目", width: "50%", cell: (row) => row.name },
  { id: "status", header: "状態", align: "end", cell: (row) => row.status },
];
const rows: readonly StatusRow[] = [
  { id: "summary", name: "概要", status: "確認済み" },
  { id: "notice", name: "お知らせ", status: "準備中" },
];
const getRowKey = (row: StatusRow) => row.id;
const meta = {
  title: "Sugar/Table/StaticData",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "読み取り専用の**列定義**から、列幅・見出し・行・空表示をまとめて組み立てる sugar です。",
          "`Table` を直接組むのと出来上がりは同じで、違うのは列の指定が 1 箇所に集まることだけです。",
          "列が固定で数個なら `Table` を直接組む方が読めます。列を出し分ける、",
          "同じ列定義を複数の表で使う、といった場合にこちらを選びます。",
          "取得・並べ替え・絞り込みは持たず、`toolbar` と `pagination` は要素として受け取ります。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[40rem] max-w-[calc(100vw-2rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
/** 列定義と行を渡した基本形。`caption` が表全体の名前になる。 */
export const Default: Story = {
  render: () => (
    <StaticDataTable
      caption="現在の状態"
      columns={columns}
      getRowKey={getRowKey}
      label="現在の状態"
      rows={rows}
    />
  ),
};
/** 行が 0 件の場合。表の骨格は残し、空であることを行として示す。 */
export const Empty: Story = {
  render: () => (
    <StaticDataTable columns={columns} getRowKey={getRowKey} label="現在の状態" rows={[]} />
  ),
};
/** ページ移動を添える場合。移動そのものは `Pagination` が持ち、この sugar は場所だけを決める。 */
export const WithPagination: Story = {
  render: () => (
    <StaticDataTable
      columns={columns}
      getRowKey={getRowKey}
      label="現在の状態"
      pagination={
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationLink href="?page=1" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="?page=2">2</PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      }
      rows={rows}
    />
  ),
};
/** 表の上へ操作を置く場合。中身は要素として受け取るため、検索でも絞り込みでも構わない。 */
export const WithSearch: Story = {
  render: () => (
    <StaticDataTable
      columns={columns}
      getRowKey={getRowKey}
      label="現在の状態"
      rows={rows}
      toolbar={
        <form action="/" aria-label="項目を検索" className="max-w-sm" method="get">
          <Input aria-label="項目を検索" name="query" placeholder="項目を検索" type="search" />
        </form>
      }
    />
  ),
};

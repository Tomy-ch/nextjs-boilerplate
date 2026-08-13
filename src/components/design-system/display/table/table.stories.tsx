import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

function BasicTable() {
  return (
    <Table label="最近の更新">
      <TableCaption>最近の更新</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">項目</TableHead>
          <TableHead scope="col">状態</TableHead>
          <TableHead scope="col">更新日</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>概要</TableCell>
          <TableCell>更新済み</TableCell>
          <TableCell>2026-08-02</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>補足</TableCell>
          <TableCell>確認中</TableCell>
          <TableCell>2026-08-01</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function TableWithFooter() {
  return (
    <Table label="処理状況">
      <TableCaption>処理状況</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">区分</TableHead>
          <TableHead scope="col">件数</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>完了</TableCell>
          <TableCell>12</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableHead scope="row">合計</TableHead>
          <TableCell>12</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

const meta = {
  title: "Display/Table",
  component: Table,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[40rem] max-w-[calc(100vw-2rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

/** caption・列見出し・データ行だけを示す基本表。 */
export const Default: Story = { render: () => <BasicTable /> };

/** 集計を表す footer を追加した表。 */
export const WithFooter: Story = { render: () => <TableWithFooter /> };

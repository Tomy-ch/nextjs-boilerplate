import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../../action/button/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../display/table/table";

const meta = {
  title: "Foundation/Print",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "紙と PDF 保存へ出したときの体裁。画面上では差が見えないため、browser の印刷プレビュー（⌘P）で確認する。",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** 印刷プレビューを開く。この部品は CSS だけなので、印刷の実行は story 側に置く。 */
const openPrintPreview = () => window.print();

/** 確認用の印刷ボタン。紙には出ないよう自身へ `print-hidden` を付ける。 */
function PrintButton() {
  return (
    <div className="print-hidden flex items-center gap-2">
      <Button onClick={openPrintPreview} size="sm" type="button" variant="outline">
        印刷プレビューを開く
      </Button>
      <span className="text-muted-foreground text-sm">このボタン自体は紙に出ない</span>
    </div>
  );
}

const SECTIONS = Array.from({ length: 8 }, (_, index) => `第 ${index + 1} 節`);

const ROWS = [
  { id: "1", name: "スタンダードプラン", price: "¥1,200", contracts: "1,204" },
  { id: "2", name: "ライトプラン", price: "¥600", contracts: "312" },
  { id: "3", name: "エンタープライズプラン", price: "¥12,000", contracts: "38" },
];

/**
 * 印刷しない要素と、印刷にだけ出す要素。前者は紙の上で押せず場所だけを占め、後者は画面では
 * link や操作で辿れていた情報を紙で補う。
 */
export const HiddenAndOnly: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-4">
      <PrintButton />

      <section className="flex flex-col gap-2">
        <h2 className="font-bold text-lg">契約プラン一覧</h2>
        <p className="text-sm">画面と紙のどちらにも出る本文。</p>
      </section>

      <p className="print-only text-sm">
        この行は `print-only` を付けてあるため、画面には出ず紙にだけ出る（出力日・出典など）
      </p>
    </div>
  ),
};

const LONG_ROWS = Array.from({ length: 40 }, (_, index) => ({
  ...ROWS[index % ROWS.length],
  key: `row-${index}`,
}));

/**
 * 表が紙をまたぐ場合。見出し行は各紙面の先頭へ繰り返され、行の途中では切れない。行数を増やして
 * 印刷プレビューで確認する。
 */
export const LongTable: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <PrintButton />
      <Table className="max-w-xl" label="契約プランの一覧">
        <TableHeader>
          <TableRow>
            <TableHead>プラン名</TableHead>
            <TableHead>月額</TableHead>
            <TableHead>契約数</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {LONG_ROWS.map((row) => (
            <TableRow key={row.key}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.price}</TableCell>
              <TableCell>{row.contracts}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};

/**
 * 見出しと段落の分断。見出しは続く本文と同じ紙面に残り、段落は 1 行だけこぼれない。
 */
export const PageBreaks: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-4">
      <PrintButton />
      {SECTIONS.map((section) => (
        <section className="flex flex-col gap-2" key={section}>
          <h3 className="font-bold">{section}</h3>
          <p className="text-sm">
            紙をまたぐ位置に見出しが来ても、見出しだけが前の紙の末尾に残ることはない。段落は 1
            行だけ次の紙へこぼれないよう、前後に 3
            行を残す。この段落は紙面をまたがせるための本文で、 内容そのものに意味はない。
          </p>
        </section>
      ))}
    </div>
  ),
};

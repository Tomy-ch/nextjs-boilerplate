import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useState } from "react";

import { Button } from "@/components/design-system/action/button/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/design-system/display/table/table";
import { CheckboxClient } from "@/components/design-system/form/checkbox-client/checkbox-client";
import { SelectAllCheckbox, SelectionToolbar } from "./selection-toolbar";
import { SELECTION_TOOLBAR_POSITION } from "./selection-toolbar.definition";

const meta = {
  title: "Container/SelectionToolbar",
  component: SelectionToolbar,
  parameters: { layout: "padded" },
  args: { selectedCount: 3, totalCount: 340 },
} satisfies Meta<typeof SelectionToolbar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Selected: Story = {
  args: {
    children: (
      <>
        <Button size="sm" type="button" variant="outline">
          公開する
        </Button>
        <Button size="sm" type="button" variant="outline">
          削除する
        </Button>
      </>
    ),
    onClearSelection: () => undefined,
  },
  parameters: {
    docs: {
      description: {
        story: "選択がある状態。操作は「選択した 3 件への操作」という名前の group にまとまる。",
      },
    },
  },
};

export const NoSelection: Story = {
  args: {
    selectedCount: 0,
    children: (
      <Button size="sm" type="button" variant="outline">
        公開する
      </Button>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "選択が無い状態。枠も高さも持たないが要素は残るため、最初の 1 件の選択から読み上げられる。",
      },
    },
  },
};

export const WithoutTotal: Story = {
  args: { totalCount: undefined },
  parameters: {
    docs: { description: { story: "母数が分からない場合は選択件数だけを伝える。" } },
  },
};

export const CustomUnit: Story = {
  args: { selectedCount: 2, totalCount: 48, unit: "人" },
  parameters: {
    docs: { description: { story: "単位は対象に合わせて差し替える。" } },
  },
};

const ROWS = [
  { id: "1", name: "スタンダードプラン", status: "公開中" },
  { id: "2", name: "ライトプラン", status: "下書き" },
  { id: "3", name: "エンタープライズプラン", status: "公開中" },
];

function SelectableRow({
  row,
  selected,
  onToggle,
}: {
  row: (typeof ROWS)[number];
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const toggle = useCallback(() => onToggle(row.id), [onToggle, row.id]);

  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell>
        <CheckboxClient
          aria-label={`${row.name} を選択`}
          checked={selected}
          onCheckedChange={toggle}
        />
      </TableCell>
      <TableCell>{row.name}</TableCell>
      <TableCell>{row.status}</TableCell>
    </TableRow>
  );
}

function SelectableTable() {
  const [selected, setSelected] = useState<readonly string[]>([]);
  const toggleRow = useCallback(
    (id: string) =>
      setSelected((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      ),
    [],
  );
  const selectAll = useCallback(
    (all: boolean) => setSelected(all ? ROWS.map((row) => row.id) : []),
    [],
  );
  const clear = useCallback(() => setSelected([]), []);

  return (
    <div className="flex flex-col gap-3">
      <SelectionToolbar
        onClearSelection={clear}
        selectedCount={selected.length}
        totalCount={ROWS.length}
      >
        <Button size="sm" type="button" variant="outline">
          公開する
        </Button>
        <Button size="sm" type="button" variant="outline">
          削除する
        </Button>
      </SelectionToolbar>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SelectAllCheckbox
                onSelectAllChange={selectAll}
                selectedCount={selected.length}
                totalCount={ROWS.length}
              />
            </TableHead>
            <TableHead>プラン名</TableHead>
            <TableHead>状態</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => (
            <SelectableRow
              key={row.id}
              onToggle={toggleRow}
              row={row}
              selected={selected.includes(row.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export const FixedToBottom: Story = {
  args: {
    position: SELECTION_TOOLBAR_POSITION.FIXED,
    onClearSelection: () => undefined,
    children: (
      <Button size="sm" type="button" variant="outline">
        削除する
      </Button>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          "viewport の下端へ固定する。最後の項目が隠れないよう、本文側の下余白は呼び出し元が置く。",
      },
    },
  },
};

export const StickyToScroll: Story = {
  args: {
    position: SELECTION_TOOLBAR_POSITION.STICKY,
    onClearSelection: () => undefined,
    children: (
      <Button size="sm" type="button" variant="outline">
        削除する
      </Button>
    ),
  },
  parameters: {
    docs: {
      description: { story: "scroll 領域の下端へ貼り付ける。内容の上へ重なるため背景は不透明。" },
    },
  },
  render: (args) => (
    <div className="flex h-64 flex-col overflow-y-auto">
      <ul className="flex-1">
        {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map((name) => (
          <li className="border-border border-b px-2 py-3 text-sm" key={name}>
            プラン {name}
          </li>
        ))}
      </ul>
      <SelectionToolbar {...args} />
    </div>
  ),
};

export const InTable: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "一覧と組み合わせた場合。行を 1 つだけ選ぶと全選択 checkbox が indeterminate になる。",
      },
    },
  },
  render: () => <SelectableTable />,
};

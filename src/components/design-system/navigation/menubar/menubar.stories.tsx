import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useState } from "react";

import { Kbd } from "../../display/kbd/kbd";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./menubar";
import { MENUBAR_ITEM_VARIANT } from "./menubar.definition";

function EditorMenubar({ defaultValue }: { defaultValue?: string }) {
  return (
    <Menubar aria-label="編集操作" defaultValue={defaultValue}>
      <MenubarMenu value="file">
        <MenubarTrigger>ファイル</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            新規作成
            <MenubarShortcut>
              <Kbd>⌘</Kbd>
              <Kbd>N</Kbd>
            </MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            開く
            <MenubarShortcut>
              <Kbd>⌘</Kbd>
              <Kbd>O</Kbd>
            </MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem disabled>取り込む</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu value="edit">
        <MenubarTrigger>編集</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>元に戻す</MenubarItem>
          <MenubarItem>やり直す</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu value="help">
        <MenubarTrigger disabled>ヘルプ</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>使い方</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

function GroupedMenubar() {
  return (
    <Menubar aria-label="項目の操作" defaultValue="item">
      <MenubarMenu value="item">
        <MenubarTrigger>項目</MenubarTrigger>
        <MenubarContent>
          <MenubarLabel>この項目の操作</MenubarLabel>
          <MenubarGroup>
            <MenubarItem>
              複製する
              <MenubarShortcut>
                <Kbd>⌘</Kbd>
                <Kbd>D</Kbd>
              </MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              名前を変更
              <MenubarShortcut>
                <Kbd>F2</Kbd>
              </MenubarShortcut>
            </MenubarItem>
          </MenubarGroup>
          <MenubarSeparator />
          <MenubarItem variant={MENUBAR_ITEM_VARIANT.DESTRUCTIVE}>削除する</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

const COLUMNS = ["名称", "更新日時", "状態"];

function preventClose(event: Event) {
  event.preventDefault();
}

function ColumnCheckboxItem({
  checked,
  column,
  onToggle,
}: {
  checked: boolean;
  column: string;
  onToggle: (column: string, checked: boolean) => void;
}) {
  const handleCheckedChange = useCallback(
    (next: boolean) => onToggle(column, next),
    [column, onToggle],
  );

  return (
    <MenubarCheckboxItem
      checked={checked}
      onCheckedChange={handleCheckedChange}
      onSelect={preventClose}
    >
      {column}
    </MenubarCheckboxItem>
  );
}

function ViewMenubar() {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(["名称"]);
  const [density, setDensity] = useState("comfortable");
  const handleToggle = useCallback((column: string, checked: boolean) => {
    setVisibleColumns((current) =>
      checked ? [...current, column] : current.filter((name) => name !== column),
    );
  }, []);

  return (
    <Menubar aria-label="表示設定" defaultValue="view">
      <MenubarMenu value="view">
        <MenubarTrigger>表示</MenubarTrigger>
        <MenubarContent>
          <MenubarLabel>表示する列</MenubarLabel>
          {COLUMNS.map((column) => (
            <ColumnCheckboxItem
              checked={visibleColumns.includes(column)}
              column={column}
              key={column}
              onToggle={handleToggle}
            />
          ))}
          <MenubarSeparator />
          <MenubarLabel>表示密度</MenubarLabel>
          <MenubarRadioGroup onValueChange={setDensity} value={density}>
            <MenubarRadioItem onSelect={preventClose} value="comfortable">
              標準
            </MenubarRadioItem>
            <MenubarRadioItem onSelect={preventClose} value="compact">
              高密度
            </MenubarRadioItem>
          </MenubarRadioGroup>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

function NestedMenubar() {
  return (
    <Menubar aria-label="共有操作" defaultValue="share">
      <MenubarMenu value="share">
        <MenubarTrigger>共有</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>リンクをコピー</MenubarItem>
          <MenubarSub>
            <MenubarSubTrigger>権限を変更</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>閲覧のみ</MenubarItem>
              <MenubarItem>編集を許可</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

function InsetMenubar() {
  return (
    <Menubar aria-label="表示の切り替え" defaultValue="layout">
      <MenubarMenu value="layout">
        <MenubarTrigger>レイアウト</MenubarTrigger>
        <MenubarContent>
          <MenubarCheckboxItem checked>サイドバーを表示</MenubarCheckboxItem>
          <MenubarSeparator />
          <MenubarLabel inset>並び順</MenubarLabel>
          <MenubarItem inset>名前順</MenubarItem>
          <MenubarItem inset>更新日時順</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

const meta = {
  title: "Navigation/Menubar",
  component: Menubar,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Menubar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 複数の menu を横に並べた基本構成。開いた状態で左右キーまたは hover に切り替えると、
 * 隣の menu へそのまま移る。`disabled` な trigger は移動先から外れる。
 */
export const Default: Story = { render: () => <EditorMenubar /> };

/** `defaultValue` で最初から開いておく場合。 */
export const Open: Story = { render: () => <EditorMenubar defaultValue="file" /> };

/** 見出し・group・区切り・shortcut 表示・破壊的操作を組み合わせた場合。 */
export const Grouped: Story = { render: () => <GroupedMenubar /> };

/**
 * 複数選択と択一選択を含む場合。続けて切り替えられるよう `onSelect` で
 * `preventDefault` している。
 */
export const WithSelection: Story = { render: () => <ViewMenubar /> };

/** 入れ子の menu を持つ場合。 */
export const Nested: Story = { render: () => <NestedMenubar /> };

/** indicator を持つ項目と並べる場合。`inset` で左端の余白を揃える。 */
export const Inset: Story = { render: () => <InsetMenubar /> };

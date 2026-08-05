import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import { useId } from "react";

import { Button } from "../../action/button/button";
import { Separator } from "../../display/separator/separator";
import { CheckboxNative } from "../../form/checkbox-native/checkbox-native";
import { Label } from "../../form/label/label";
import { SelectNative, SelectNativeOption } from "../../form/select-native/select-native";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import { SHEET_SIDE, type SheetSide } from "./sheet.definition";

function NavigationSheet({
  defaultOpen = false,
  side = SHEET_SIDE.RIGHT,
}: {
  defaultOpen?: boolean;
  side?: SheetSide;
}) {
  return (
    <Sheet defaultOpen={defaultOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">メニューを開く</Button>
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>メニュー</SheetTitle>
          <SheetDescription>各セクションへ移動します。</SheetDescription>
        </SheetHeader>
        <nav aria-label="セクション">
          <ul className="flex flex-col gap-1 px-4">
            <li>
              <Link className="block py-2 underline-offset-4 hover:underline" href="/overview">
                概要
              </Link>
            </li>
            <li>
              <Link className="block py-2 underline-offset-4 hover:underline" href="/list">
                一覧
              </Link>
            </li>
            <li>
              <Link className="block py-2 underline-offset-4 hover:underline" href="/settings">
                設定
              </Link>
            </li>
          </ul>
        </nav>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">閉じる</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FilterSheet() {
  const orderId = useId();
  const inStockId = useId();

  return (
    <Sheet defaultOpen>
      <SheetTrigger asChild>
        <Button variant="outline">絞り込み</Button>
      </SheetTrigger>
      <SheetContent side={SHEET_SIDE.LEFT}>
        <SheetHeader>
          <SheetTitle>絞り込み</SheetTitle>
          <SheetDescription>条件を指定して一覧の表示範囲を変更します。</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <div className="grid gap-2">
            <Label htmlFor={orderId}>並び順</Label>
            <SelectNative defaultValue="newest" id={orderId} name="order">
              <SelectNativeOption value="newest">新しい順</SelectNativeOption>
              <SelectNativeOption value="oldest">古い順</SelectNativeOption>
              <SelectNativeOption value="name">名前順</SelectNativeOption>
            </SelectNative>
          </div>
          <Separator />
          <div className="flex items-center gap-2">
            <CheckboxNative defaultChecked id={inStockId} name="available" value="1" />
            <Label htmlFor={inStockId}>表示可能な項目のみ</Label>
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">キャンセル</Button>
          </SheetClose>
          <Button type="submit">適用</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DescriptionlessSheet() {
  return (
    <Sheet defaultOpen>
      <SheetTrigger asChild>
        <Button variant="outline">補足を開く</Button>
      </SheetTrigger>
      <SheetContent aria-describedby={undefined} side={SHEET_SIDE.BOTTOM}>
        <SheetHeader>
          <SheetTitle>補足情報</SheetTitle>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

function CustomCloseSheet() {
  return (
    <Sheet defaultOpen>
      <SheetTrigger asChild>
        <Button variant="outline">確認する</Button>
      </SheetTrigger>
      <SheetContent showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>内容の確認</SheetTitle>
          <SheetDescription>内容を確認してから閉じてください。</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose asChild>
            <Button>確認した</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const meta = {
  title: "Overlay/Sheet",
  component: Sheet,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** trigger を操作して開く基本構成。 */
export const Default: Story = { render: () => <NavigationSheet /> };

/** 既定の `right` から開いた状態。title・説明・footer の構成を確認する。 */
export const FromRight: Story = { render: () => <NavigationSheet defaultOpen /> };

/** 画面左端へ固定する場合。 */
export const FromLeft: Story = {
  render: () => <NavigationSheet defaultOpen side={SHEET_SIDE.LEFT} />,
};

/** 画面上端へ固定する場合。高さは内容に合わせて伸縮する。 */
export const FromTop: Story = {
  render: () => <NavigationSheet defaultOpen side={SHEET_SIDE.TOP} />,
};

/** 画面下端へ固定する場合。 */
export const FromBottom: Story = {
  render: () => <NavigationSheet defaultOpen side={SHEET_SIDE.BOTTOM} />,
};

/** 絞り込み面として form 部品を内容に置く場合。入力は native form へ委ねる。 */
export const WithFormControls: Story = { render: () => <FilterSheet /> };

/** 説明が不要な場合。`aria-describedby={undefined}` を明示する。 */
export const WithoutDescription: Story = { render: () => <DescriptionlessSheet /> };

/** 右上の閉じる操作を置かず、footer の操作だけで閉じる場合。 */
export const WithoutCloseButton: Story = { render: () => <CustomCloseSheet /> };

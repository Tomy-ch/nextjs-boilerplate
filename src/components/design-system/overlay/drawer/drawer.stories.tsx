import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useId, useState } from "react";

import { Button } from "../../action/button/button";
import { Separator } from "../../display/separator/separator";
import { CheckboxNative } from "../../form/checkbox-native/checkbox-native";
import { Label } from "../../form/label/label";
import { SelectNative, SelectNativeOption } from "../../form/select-native/select-native";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";
import { DRAWER_DIRECTION, type DrawerDirection } from "./drawer.definition";

function DetailDrawer({
  defaultOpen = false,
  direction,
}: {
  defaultOpen?: boolean;
  direction?: DrawerDirection;
}) {
  return (
    <Drawer defaultOpen={defaultOpen} direction={direction}>
      <DrawerTrigger asChild>
        <Button variant="outline">補足を開く</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>表示条件</DrawerTitle>
          <DrawerDescription>
            条件を満たす項目だけを一覧に表示します。条件は保存されません。
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">閉じる</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function FilterDrawer() {
  const orderId = useId();
  const availableId = useId();

  return (
    <Drawer defaultOpen>
      <DrawerTrigger asChild>
        <Button variant="outline">絞り込み</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>絞り込み</DrawerTitle>
          <DrawerDescription>条件を指定して一覧の表示範囲を変更します。</DrawerDescription>
        </DrawerHeader>
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
            <CheckboxNative defaultChecked id={availableId} name="available" value="1" />
            <Label htmlFor={availableId}>表示可能な項目のみ</Label>
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">キャンセル</Button>
          </DrawerClose>
          <Button type="submit">適用</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function NonDismissibleDrawer() {
  const [open, setOpen] = useState(true);
  const close = useCallback(() => setOpen(false), []);
  const openDrawer = useCallback(() => setOpen(true), []);

  return (
    <>
      <Button onClick={openDrawer} variant="outline">
        確認する
      </Button>
      <Drawer dismissible={false} onOpenChange={setOpen} open={open}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>内容の確認</DrawerTitle>
            <DrawerDescription>
              drag・背面・Escape・`DrawerClose` のいずれでも閉じません。閉じる条件は呼び出し元が
              `open` で決めます。
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button onClick={close}>確認した</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function DescriptionlessDrawer() {
  return (
    <Drawer defaultOpen>
      <DrawerTrigger asChild>
        <Button variant="outline">補足を開く</Button>
      </DrawerTrigger>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>補足情報</DrawerTitle>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  );
}

const meta = {
  title: "Overlay/Drawer",
  component: Drawer,
  parameters: {
    layout: "centered",
    docs: {
      story: { inline: false, iframeHeight: 420 },
      description: {
        component: [
          "drag で閉じられる modal panel です。touch 前提の操作が要る場合に選び、pointer と keyboard だけで",
          "完結する固定パネルには `Sheet` を使います。drag の追従は実機での確認が要るため、",
          "Storybook では配置・掴み手・開閉の構成を確認します。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** trigger を操作して開く基本構成。 */
export const Default: Story = { render: () => <DetailDrawer /> };

/** 既定の `bottom` から開いた状態。上端に drag を促す掴み手が出る。 */
export const FromBottom: Story = { render: () => <DetailDrawer defaultOpen /> };

/** 画面上端から引き出す場合。掴み手は出ない。 */
export const FromTop: Story = {
  render: () => <DetailDrawer defaultOpen direction={DRAWER_DIRECTION.TOP} />,
};

/** 画面左端から引き出す場合。縦長のパネルになる。 */
export const FromLeft: Story = {
  render: () => <DetailDrawer defaultOpen direction={DRAWER_DIRECTION.LEFT} />,
};

/** 画面右端から引き出す場合。 */
export const FromRight: Story = {
  render: () => <DetailDrawer defaultOpen direction={DRAWER_DIRECTION.RIGHT} />,
};

/** 絞り込み面として form 部品を内容に置く場合。入力は native form へ委ねる。 */
export const WithFormControls: Story = { render: () => <FilterDrawer /> };

/** `dismissible={false}` の場合。内部の閉じる経路がすべて塞がるため `open` を制御する。 */
export const NonDismissible: Story = { render: () => <NonDismissibleDrawer /> };

/** 説明が不要な場合。`aria-describedby={undefined}` を明示する。 */
export const WithoutDescription: Story = { render: () => <DescriptionlessDrawer /> };

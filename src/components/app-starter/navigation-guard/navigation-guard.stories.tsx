import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import type { ChangeEvent } from "react";
import { useCallback, useId, useState } from "react";

import { Button } from "../../design-system/action/button/button";
import { Input } from "../../design-system/form/input/input";
import { Label } from "../../design-system/form/label/label";
import { UnloadGuard } from "../unload-guard/unload-guard";
import { NavigationGuard } from "./navigation-guard";

const meta = {
  title: "Navigation/NavigationGuard",
  component: NavigationGuard,
  parameters: { layout: "centered" },
} satisfies Meta<typeof NavigationGuard>;

export default meta;
type Story = StoryObj<typeof meta>;

function EditScreen({ withUnloadGuard = false }: { withUnloadGuard?: boolean }) {
  const nameId = useId();
  const [value, setValue] = useState("標準プラン");
  const [saved, setSaved] = useState("標準プラン");
  const isDirty = value !== saved;
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  }, []);
  const handleSave = useCallback(() => setSaved(value), [value]);

  return (
    <NavigationGuard when={isDirty}>
      {withUnloadGuard ? <UnloadGuard when={isDirty} /> : null}
      <div className="flex w-96 flex-col gap-4 rounded-md border border-border p-4">
        <nav className="flex gap-4 text-sm">
          <Link className="underline underline-offset-4" href="/plans">
            一覧へ戻る
          </Link>
          <Link className="underline underline-offset-4" href="/settings">
            設定
          </Link>
        </nav>
        <div className="flex flex-col gap-2">
          <Label htmlFor={nameId}>名称</Label>
          <Input id={nameId} name="name" onChange={handleChange} value={value} />
        </div>
        <p className="text-sm text-muted-foreground">
          {isDirty ? "未保存の変更があります。" : "変更はありません。"}
        </p>
        <Button disabled={!isDirty} onClick={handleSave} type="button">
          保存する
        </Button>
      </div>
    </NavigationGuard>
  );
}

/** 入力を変えてから link を押すと、遷移の前に確認が出る。 */
export const Default: Story = {
  args: { children: null, when: true },
  render: () => <EditScreen />,
};

/** 文言は呼び出し元が差し替えられる。 */
export const CustomLabels: Story = {
  args: { children: null, when: true },
  render: () => (
    <NavigationGuard
      cancelLabel="編集を続ける"
      confirmLabel="破棄して移動"
      description="下書きは保存されません。"
      title="下書きが残っています"
      when
    >
      <Link className="underline underline-offset-4" href="/plans">
        一覧へ戻る
      </Link>
    </NavigationGuard>
  ),
};

/** 画面を離れる意図が明示された link は対象にしない。 */
export const NotGuarded: Story = {
  args: { children: null, when: true },
  render: () => (
    <NavigationGuard when>
      <div className="flex w-96 flex-col gap-2 text-sm">
        <Link className="underline underline-offset-4" href="/plans">
          アプリ内の遷移（確認する）
        </Link>
        <Link className="underline underline-offset-4" href="/manual.pdf" download>
          download 指定（確認しない）
        </Link>
        <Link
          className="underline underline-offset-4"
          href="/help"
          rel="noreferrer"
          target="_blank"
        >
          別タブで開く（確認しない）
        </Link>
        <a className="underline underline-offset-4" href="https://example.com">
          外部サイト（確認しない）
        </a>
      </div>
    </NavigationGuard>
  ),
};

/** リロードとタブ閉じも塞ぐ場合は `UnloadGuard` と併用する。 */
export const WithUnloadGuard: Story = {
  args: { children: null, when: true },
  render: () => <EditScreen withUnloadGuard />,
};

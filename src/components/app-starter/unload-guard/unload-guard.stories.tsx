import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useId, useState } from "react";

import { Button } from "../../design-system/action/button/button";
import { Input } from "../../design-system/form/input/input";
import { Label } from "../../design-system/form/label/label";
import { UnloadGuard } from "./unload-guard";

const meta = {
  title: "Navigation/UnloadGuard",
  component: UnloadGuard,
  parameters: { layout: "centered" },
} satisfies Meta<typeof UnloadGuard>;

export default meta;
type Story = StoryObj<typeof meta>;

function EditForm() {
  const nameId = useId();
  const [value, setValue] = useState("標準プラン");
  const [saved, setSaved] = useState("標準プラン");
  const isDirty = value !== saved;
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  }, []);
  const handleSave = useCallback(() => setSaved(value), [value]);

  return (
    <form action="/plans" className="flex w-96 flex-col gap-4 rounded-md border border-border p-4">
      <UnloadGuard when={isDirty} />
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
    </form>
  );
}

/**
 * 入力を変えると未保存になり、リロードやタブを閉じる操作で browser が確認を出す。
 * 何も描画しないため、`UnloadGuard` 自体は画面に現れない。
 */
export const Default: Story = { args: { when: true }, render: () => <EditForm /> };

/** 未保存の変更が無い状態。離脱は妨げられない。 */
export const Inactive: Story = {
  args: { when: false },
  render: (args) => (
    <div className="w-96 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
      <UnloadGuard {...args} />
      when が false のため、離脱の確認は登録されない
    </div>
  ),
};

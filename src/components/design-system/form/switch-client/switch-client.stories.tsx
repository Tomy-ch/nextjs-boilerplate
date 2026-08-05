import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useId, useState } from "react";

import { Label } from "../label/label";
import { SWITCH_SIZE, type SwitchSize } from "../switch-native/switch-native.definition";
import { SwitchClient } from "./switch-client";

function ControlledSwitch({
  disabled = false,
  size = SWITCH_SIZE.DEFAULT,
}: {
  disabled?: boolean;
  size?: SwitchSize;
}) {
  const switchId = useId();
  const [checked, setChecked] = useState(true);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <SwitchClient
          checked={checked}
          disabled={disabled}
          id={switchId}
          onCheckedChange={setChecked}
          size={size}
        />
        <Label htmlFor={switchId}>通知を受け取る</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        現在の設定: {checked ? "受け取る" : "受け取らない"}
      </p>
    </div>
  );
}

function DependentSwitches() {
  const allId = useId();
  const mailId = useId();
  const [mail, setMail] = useState(true);
  const [push, setPush] = useState(false);
  const setAll = useCallback((next: boolean) => {
    setMail(next);
    setPush(next);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SwitchClient checked={mail && push} id={allId} onCheckedChange={setAll} />
        <Label htmlFor={allId}>すべて受け取る</Label>
      </div>
      <div className="flex items-center gap-2 pl-6">
        <SwitchClient checked={mail} id={mailId} onCheckedChange={setMail} />
        <Label htmlFor={mailId}>メール</Label>
      </div>
      <div className="flex items-center gap-2 pl-6">
        <SwitchClient aria-label="プッシュ通知" checked={push} onCheckedChange={setPush} />
        <span className="text-sm">プッシュ通知</span>
      </div>
    </div>
  );
}

const meta = {
  title: "Form/SwitchClient",
  component: SwitchClient,
  parameters: { layout: "centered" },
} satisfies Meta<typeof SwitchClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 切り替えた結果を即座に画面へ反映する場合。 */
export const Default: Story = { render: () => <ControlledSwitch /> };

/** 操作を受け付けない状態。 */
export const Disabled: Story = { render: () => <ControlledSwitch disabled /> };

/** 表示サイズ。`SwitchNative` と同じ定数を参照する。 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <ControlledSwitch size={SWITCH_SIZE.SMALL} />
      <ControlledSwitch size={SWITCH_SIZE.DEFAULT} />
    </div>
  ),
};

/** 複数の switch を互いに同期させる場合。native では組めない用途。 */
export const Dependent: Story = { render: () => <DependentSwitches /> };

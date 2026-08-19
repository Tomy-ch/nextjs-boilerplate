import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../../action/button/button";
import { BUTTON_SIZE, BUTTON_VARIANT } from "../../action/button/button.definition";
import { KeyboardShortcut, KeyboardShortcutList } from "./keyboard-shortcut";
import { SHORTCUT_MODIFIER, SHORTCUT_PLATFORM } from "./keyboard-shortcut.definition";
import { KeyboardShortcutKeys } from "./keyboard-shortcut-keys";

const SAMPLE_SHORTCUTS: ReadonlyArray<{ keys: readonly string[]; label: string }> = [
  { keys: [SHORTCUT_MODIFIER.MOD, "K"], label: "検索を開く" },
  { keys: [SHORTCUT_MODIFIER.MOD, SHORTCUT_MODIFIER.SHIFT, "P"], label: "コマンドを実行する" },
  { keys: [SHORTCUT_MODIFIER.MOD, "S"], label: "保存する" },
  { keys: ["Escape"], label: "閉じる" },
  { keys: ["?"], label: "この一覧を開く" },
];

function DefaultList() {
  return (
    <KeyboardShortcutList className="w-80">
      {SAMPLE_SHORTCUTS.map((shortcut) => (
        <KeyboardShortcut key={shortcut.label} keys={shortcut.keys}>
          {shortcut.label}
        </KeyboardShortcut>
      ))}
    </KeyboardShortcutList>
  );
}

function PlatformComparison() {
  return (
    <div className="flex gap-10">
      {[SHORTCUT_PLATFORM.APPLE, SHORTCUT_PLATFORM.OTHER].map((platform) => (
        <KeyboardShortcutList className="w-64" key={platform}>
          <KeyboardShortcut className="font-emphasis" keys={["?"]} platform={platform}>
            {platform}
          </KeyboardShortcut>
          {SAMPLE_SHORTCUTS.slice(0, 3).map((shortcut) => (
            <KeyboardShortcut key={shortcut.label} keys={shortcut.keys} platform={platform}>
              {shortcut.label}
            </KeyboardShortcut>
          ))}
        </KeyboardShortcutList>
      ))}
    </div>
  );
}

function AllModifiers() {
  return (
    <KeyboardShortcutList className="w-80">
      <KeyboardShortcut keys={[SHORTCUT_MODIFIER.MOD, "K"]}>mod</KeyboardShortcut>
      <KeyboardShortcut keys={[SHORTCUT_MODIFIER.ALT, "K"]}>alt</KeyboardShortcut>
      <KeyboardShortcut keys={[SHORTCUT_MODIFIER.SHIFT, "K"]}>shift</KeyboardShortcut>
      <KeyboardShortcut keys={[SHORTCUT_MODIFIER.CONTROL, "K"]}>control</KeyboardShortcut>
      <KeyboardShortcut keys={["Enter"]}>表記の変わらないキー</KeyboardShortcut>
    </KeyboardShortcutList>
  );
}

function InlineHint() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        文中では <KeyboardShortcutKeys keys={[SHORTCUT_MODIFIER.MOD, "K"]} /> のように置きます。
      </p>
      <Button size={BUTTON_SIZE.SMALL} variant={BUTTON_VARIANT.OUTLINE}>
        検索
        <KeyboardShortcutKeys className="ml-2" keys={[SHORTCUT_MODIFIER.MOD, "K"]} />
      </Button>
    </div>
  );
}

const meta = {
  title: "Display/KeyboardShortcut",
  component: KeyboardShortcutList,
  parameters: { layout: "centered" },
} satisfies Meta<typeof KeyboardShortcutList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 操作の説明とキーの対を並べた一覧。表記は閲覧環境から決まる。 */
export const Default: Story = { render: () => <DefaultList /> };

/** `platform` で表記を固定した場合。Apple では `⌘`、それ以外では `Ctrl` になる。 */
export const Platforms: Story = { render: () => <PlatformComparison /> };

/** 表記が変わる修飾キー 4 種と、そのまま表示されるキー。 */
export const Modifiers: Story = { render: () => <AllModifiers /> };

/** 一覧ではなく、文中や操作の隣へキーだけを添える場合。 */
export const Inline: Story = { render: () => <InlineHint /> };

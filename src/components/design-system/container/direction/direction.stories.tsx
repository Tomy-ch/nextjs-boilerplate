import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "../../action/button/button";
import { Marker, MarkerContent } from "../../display/marker/marker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../overlay/dropdown-menu/dropdown-menu";
import { DirectionProvider } from "./direction";
import { DIRECTION, type DirectionValue } from "./direction.definition";

function MenuSample() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">操作</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>表示</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>詳細を開く</DropdownMenuItem>
        <DropdownMenuItem>設定へ移動</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DirectionSample({ dir }: { dir?: DirectionValue }) {
  return (
    <div className="flex flex-col gap-3">
      <DirectionProvider dir={dir}>
        <MenuSample />
      </DirectionProvider>
      <Marker>
        <MarkerContent>Provider の向き: {dir ?? `${DIRECTION.LTR}（省略時の既定）`}</MarkerContent>
      </Marker>
    </div>
  );
}

const meta = {
  title: "Container/Direction",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "配下の component へ文字送りの向きを伝える Provider です。このリポジトリは `ltr` を既定に固定し、",
          "利用者が向きを切り替える機能は持ちません。`rtl` の story は、Provider を差し替えたときに配下の",
          "component がどう変わるかを示すためのものです。向きで配置や矢印キーの意味が変わる例として",
          "`DropdownMenu` を合成しています。",
        ].join(""),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** 省略時の既定。`ltr` として振る舞う。 */
export const Default: Story = { render: () => <DirectionSample /> };

/** `ltr` を明示した場合。既定と同じ振る舞いになる。 */
export const Ltr: Story = { render: () => <DirectionSample dir={DIRECTION.LTR} /> };

/** `rtl` を渡した場合。配下の component が向きを読み取って配置と操作を変える。 */
export const Rtl: Story = { render: () => <DirectionSample dir={DIRECTION.RTL} /> };

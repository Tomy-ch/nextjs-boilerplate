import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import { userEvent, within } from "storybook/test";

import { Button } from "@/components/design-system/action/button/button";

import { ContentContainer } from "../content-container/content-container";
import { AppShell } from "./app-shell";
import type { AppShellNavItem } from "./app-shell.definition";

const NAV_ITEMS: readonly AppShellNavItem[] = [
  { href: "/reports", label: "レポート" },
  { href: "/settings", label: "設定" },
];

function Body() {
  return (
    <ContentContainer className="space-y-4 py-8">
      <h1 className="text-2xl font-semibold">画面の本文</h1>
      <p>
        器は幅を絞りません。読み幅と左右余白は `ContentContainer` が持ちます。全幅の背景や図を
        置く画面も、器を剥がさずに済みます。
      </p>
    </ContentContainer>
  );
}

const meta = {
  title: "Layout/AppShell",
  component: AppShell,
  parameters: {
    docs: {
      story: { inline: false, iframeHeight: 640 },
      description: {
        component: [
          "利用者向けの画面の外枠です。導線は header へ横に並べ、その幅を割けない帯では overlay へ畳みます。",
          "管理画面は導線を脇へ置く `AdminShell` を使います。",
        ].join(""),
      },
    },
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/reports" } },
  },
  args: {
    siteName: "nextjs-boilerplate",
    navItems: NAV_ITEMS,
    children: <Body />,
    headerActions: (
      <Button asChild size="sm" variant="outline">
        <Link href="/settings">設定</Link>
      </Button>
    ),
    footer: <p>© nextjs-boilerplate</p>,
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 導線を横に並べられる幅。いま開いている画面に印が付く。 */
export const Default: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 脇に領域を並べた状態。幅と区切り線は渡す側が持ち、器は場所だけを空ける。 */
export const WithSidebar: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    sidebar: (
      <aside className="w-full border-t p-4 md:w-64 md:border-l md:border-t-0">
        <p className="text-sm text-muted-foreground">脇の領域</p>
      </aside>
    ),
  },
};

/** 導線を横に並べられない幅。header には開く操作だけが残る。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** overlay を開いた状態。出す導線は横並びと同じで、幅で顔ぶれを変えない。 */
export const MenuOpen: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "メニューを開く" }));
  },
};

/** 畳むものが無い場合。開く操作ごと出ないので、空の overlay へ入る経路が残らない。 */
export const WithoutNav: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  args: { navItems: [], headerActions: undefined },
};

/** 導線が主体を待つ場合。穴だけが渡っていれば、届く前でも開く操作は残る。 */
export const MenuFromSlotOnly: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  args: {
    navItems: [],
    headerActions: undefined,
    menuNavSlot: <Link href="/settings">設定</Link>,
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "メニューを開く" }));
  },
};

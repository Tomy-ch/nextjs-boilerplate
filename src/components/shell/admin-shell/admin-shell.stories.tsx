import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import { userEvent, within } from "storybook/test";

import { Button } from "@/components/design-system/action/button/button";

import { ContentContainer } from "../content-container/content-container";
import { AdminShell } from "./admin-shell";
import type { AdminShellNavGroup } from "./admin-shell.definition";

const NAV_GROUPS: readonly AdminShellNavGroup[] = [
  {
    label: "商品",
    items: [
      { href: "/admin/products", label: "商品一覧" },
      { href: "/admin/products/new", label: "商品を作成" },
    ],
  },
  { label: "利用者", items: [{ href: "/admin/users", label: "利用者一覧" }] },
];

function Body() {
  return (
    <ContentContainer className="space-y-4 py-8">
      <h1 className="text-2xl font-semibold">管理画面の本文</h1>
      <p>
        器は幅を絞りません。読み幅と左右余白は `ContentContainer` が持ちます。脇の一覧は上端から
        始まり、その先頭の行が header と同じ高さで並びます。
      </p>
    </ContentContainer>
  );
}

const meta = {
  title: "Layout/AdminShell",
  component: AdminShell,
  parameters: {
    docs: {
      story: { inline: false, iframeHeight: 640 },
      description: {
        component: [
          "管理画面の外枠です。利用者向けの `AppShell` とは別の器で、導線を横ではなく脇へ置きます。",
          "脇に一覧を持てない幅では、同じ導線を overlay へ畳みます。",
        ].join(""),
      },
    },
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/admin/products" } },
  },
  args: {
    siteName: "nextjs-boilerplate",
    siteHref: "/",
    consoleName: "管理",
    homeHref: "/admin/products",
    navGroups: NAV_GROUPS,
    children: <Body />,
    headerActions: (
      <Button asChild size="sm" variant="outline">
        <Link href="/products">ユーザー画面へ</Link>
      </Button>
    ),
  },
} satisfies Meta<typeof AdminShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 脇に一覧を常設できる幅。いま開いている画面に印が付く。 */
export const Default: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 脇の一覧を畳んだ状態。本文が横いっぱいに広がる。 */
export const NavCollapsed: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "メニューの開閉" }));
  },
};

/** まとまりを畳んだ状態。見出しは遷移ではなく開閉の操作になる。 */
export const NavGroupClosed: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByText("商品"));
  },
};

/** 脇の一覧の下端に添えを置いた状態。器は中身を知らず、置き場所だけを用意する。 */
export const WithNavFooter: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { navFooter: <p>ログイン中: admin@example.com</p> },
};

/** 脇に一覧を持てない幅。導線は overlay へ畳まれ、header に開く操作だけが残る。 */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** overlay を開いた状態。出す導線は脇の一覧と同じで、幅で顔ぶれを変えない。 */
export const MenuOpenMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "メニューを開く" }));
  },
};

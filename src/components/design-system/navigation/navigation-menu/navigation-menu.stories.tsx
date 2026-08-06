import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./navigation-menu";

const CATEGORIES = [
  { description: "机上を整えるアクセサリ", href: "/categories/desk", label: "デスク周り" },
  { description: "入力機器と周辺機器", href: "/categories/input", label: "入力機器" },
  { description: "持ち運びのための収納", href: "/categories/bag", label: "バッグ" },
];

const CATEGORY_ITEM_VALUE = "categories";

function SiteNavigation({
  defaultValue,
  viewport = true,
}: {
  defaultValue?: string;
  viewport?: boolean;
}) {
  return (
    <NavigationMenu defaultValue={defaultValue} viewport={viewport}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/">ホーム</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem value={CATEGORY_ITEM_VALUE}>
          <NavigationMenuTrigger>カテゴリ</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-72 gap-1">
              {CATEGORIES.map((category) => (
                <li key={category.href}>
                  <NavigationMenuLink asChild>
                    <Link href={category.href}>
                      <span className="font-medium">{category.label}</span>
                      <span className="text-muted-foreground">{category.description}</span>
                    </Link>
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/activity">アクティビティ</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const meta = {
  title: "Navigation/NavigationMenu",
  component: NavigationMenu,
  parameters: { layout: "centered" },
} satisfies Meta<typeof NavigationMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 下位階層を持つ項目と、直接遷移する項目を並べた基本構成。 */
export const Default: Story = { render: () => <SiteNavigation /> };

/** 下位階層を開いた状態。開いた内容は共通 viewport に表示される。 */
export const Open: Story = {
  render: () => <SiteNavigation defaultValue={CATEGORY_ITEM_VALUE} />,
};

/** 共通 viewport を使わず、各項目の直下へ開く場合。 */
export const WithoutViewport: Story = {
  render: () => <SiteNavigation defaultValue={CATEGORY_ITEM_VALUE} viewport={false} />,
};

/** 現在地の項目に `active` を渡す場合。 */
export const ActiveLink: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/">ホーム</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink active asChild className={navigationMenuTriggerStyle()}>
            <Link href="/activity">アクティビティ</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};

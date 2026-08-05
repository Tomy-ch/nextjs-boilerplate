import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/design-system/action/button/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/design-system/display/table/table";
import { ContentContainer } from "@/components/shell/content-container/content-container";

import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from "./page-header";

const meta = {
  title: "Layout/PageHeader",
  component: PageHeader,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

function Body() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>名称</TableHead>
          <TableHead>状態</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>一件目</TableCell>
          <TableCell>公開</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>二件目</TableCell>
          <TableCell>下書き</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

/**
 * 既定の構成。`main` は幅を絞らず、読み幅と左右余白は `ContentContainer` が持つ。
 * 先頭ブロックは左右余白を持たないため、タイトルと本文の縦線が揃う。
 */
export const Default: Story = {
  render: () => (
    <main>
      <ContentContainer>
        <PageHeader>
          <PageHeaderTitle>メンバー一覧</PageHeaderTitle>
          <PageHeaderDescription>参加中のメンバーを確認します。</PageHeaderDescription>
          <PageHeaderActions>
            <Button variant="outline">絞り込み</Button>
            <Button>メンバーを追加</Button>
          </PageHeaderActions>
        </PageHeader>
        <Body />
      </ContentContainer>
    </main>
  ),
};

/** 説明を置かない場合。操作はタイトルの高さに合わせて右へ寄る。 */
export const WithoutDescription: Story = {
  render: () => (
    <main>
      <ContentContainer>
        <PageHeader>
          <PageHeaderTitle>設定</PageHeaderTitle>
          <PageHeaderActions>
            <Button>保存</Button>
          </PageHeaderActions>
        </PageHeader>
        <Body />
      </ContentContainer>
    </main>
  ),
};

/** 主要な操作を持たない場合。タイトルと説明だけが並ぶ。 */
export const WithoutActions: Story = {
  render: () => (
    <main>
      <ContentContainer>
        <PageHeader>
          <PageHeaderTitle>お知らせ</PageHeaderTitle>
          <PageHeaderDescription>運営からの連絡を新しい順に表示します。</PageHeaderDescription>
        </PageHeader>
        <Body />
      </ContentContainer>
    </main>
  ),
};

/**
 * 読み幅を超える viewport での見え方。`ContentContainer` が中央へ寄せ、左右に余白を残す。
 * 幅の指定は一つだけで、広い表のための variant は実画面が要求するまで足さない。
 */
export const WideViewport: Story = {
  globals: { viewport: { value: "wide" } },
  parameters: {
    viewport: {
      options: {
        wide: { name: "読み幅より広い画面", styles: { height: "720px", width: "1440px" } },
      },
    },
  },
  render: () => (
    <main className="bg-muted">
      <ContentContainer className="bg-background">
        <PageHeader>
          <PageHeaderTitle>利用状況</PageHeaderTitle>
          <PageHeaderDescription>期間を選んで内訳を確認します。</PageHeaderDescription>
          <PageHeaderActions>
            <Button variant="outline">期間を変更</Button>
          </PageHeaderActions>
        </PageHeader>
        <Body />
      </ContentContainer>
    </main>
  ),
};

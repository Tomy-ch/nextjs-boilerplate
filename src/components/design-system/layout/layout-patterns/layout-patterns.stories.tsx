import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactNode } from "react";
import { Button } from "@/components/design-system/action/button/button";
import { Badge } from "@/components/design-system/display/badge/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";
import { Marker, MarkerContent } from "@/components/design-system/display/marker/marker";
import { MediaImage } from "@/components/design-system/display/media-image/media-image";
import { MEDIA_IMAGE_ASPECT_RATIO } from "@/components/design-system/display/media-image/media-image.definition";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { SAMPLE_ITEM_URLS } from "~catalog/lib/sample-asset";

const meta = {
  title: "Layout/Layout",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "ページの骨格を Tailwind の utility だけで組むときの合成例。公開する component は無く、示すのはこのリポジトリが選んだ値と組み方だけ。",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** sticky の効きを見るために、scroll するだけの高さを作る行。 */
const SCROLL_SAMPLE_TITLES = [
  "1 件目",
  "2 件目",
  "3 件目",
  "4 件目",
  "5 件目",
  "6 件目",
  "7 件目",
  "8 件目",
];

/** 合成例の中身を埋める、業務語彙を持たない最小の card。 */
function SampleCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** 合成例ごとに、どの class を当てているかを一行で添える。 */
function PatternLabel({ children }: { children: ReactNode }) {
  return (
    <Marker>
      <MarkerContent>{children}</MarkerContent>
    </Marker>
  );
}

/**
 * 縦積み。`flex flex-col` に `gap-*` を与える。間隔を子の `margin` で作らず親の `gap` で
 * 持つと、子を並べ替えても間隔が崩れず、先頭と末尾に余分な余白も残らない。
 *
 * 三列はいずれも同じ構造で、`gap` の値だけが違う。token が名前を与えている段は `0` / `1` /
 * `2` / `4` / `6` / `8` で、密に詰めるところから節ごとの区切りまでをこの幅で賄う。
 */
export const Stack: Story = {
  render: () => (
    <div className="grid gap-6 sm:grid-cols-3">
      <div className="flex flex-col gap-2">
        <PatternLabel>gap-2</PatternLabel>
        <SampleCard title="一件目">近い関係の項目を詰めて並べる。</SampleCard>
        <SampleCard title="二件目">同じ塊に属することが間隔で判る。</SampleCard>
      </div>
      <div className="flex flex-col gap-4">
        <PatternLabel>gap-4</PatternLabel>
        <SampleCard title="一件目">一覧の既定。行として読ませる。</SampleCard>
        <SampleCard title="二件目">隣り合うが別々の項目として見える。</SampleCard>
      </div>
      <div className="flex flex-col gap-8">
        <PatternLabel>gap-8</PatternLabel>
        <SampleCard title="一件目">節として切り離す。</SampleCard>
        <SampleCard title="二件目">見出しを挟まずに区切りを作れる。</SampleCard>
      </div>
    </div>
  ),
};

/**
 * 横並び。`flex` に `flex-wrap` を添え、幅が足りなくなったら折り返させる。折り返しを許さない
 * 横並びは、画面が狭まったときに要素がはみ出すか潰れるかのどちらかにしかならない。
 *
 * 高さの違うものを混ぜるときは `items-center` で中心線を揃える。`PageHeaderActions` が
 * 採っているのもこの形である。
 */
export const Inline: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <PatternLabel>flex flex-wrap items-center gap-2</PatternLabel>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>下書き</Badge>
        <Badge variant="secondary">共有中</Badge>
        <span className="text-sm text-muted-foreground">最終更新 2026-08-04</span>
        <Button size="sm" variant="outline">
          複製
        </Button>
        <Button size="sm">編集</Button>
      </div>
    </div>
  ),
};

/**
 * grid。列の性格が二通りある。
 *
 * `grid-cols-3` は**等幅**で、同じ種類のものを並べる。`grid-cols-[auto_1fr]` は
 * **内容幅と残り**で、ラベルと値のように役割の違う二列を揃える。後者は列幅を数値で
 * 決め打ちせずに済むため、文言が伸びても縦線が揃ったままになる。
 */
export const Grid: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <PatternLabel>grid grid-cols-3 gap-4 — 等幅</PatternLabel>
        <div className="grid grid-cols-3 gap-4">
          <SampleCard title="一件目">同じ種類のものを並べる。</SampleCard>
          <SampleCard title="二件目">列は等しい幅を取る。</SampleCard>
          <SampleCard title="三件目">中身の長短で幅が動かない。</SampleCard>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <PatternLabel>grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 — 内容幅と残り</PatternLabel>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <span className="text-muted-foreground">識別子</span>
          <span>c7f1a20</span>
          <span className="text-muted-foreground">状態</span>
          <span>公開</span>
          <span className="text-muted-foreground">最終更新</span>
          <span>2026-08-04</span>
        </div>
      </div>
    </div>
  ),
};

/**
 * viewport の幅で切り替える。無印が狭い画面、`sm:` 以降で上書きしていく **mobile-first** で
 * 書く。この向きを逆にすると、無印に広い画面の指定が入り、狭い側を打ち消すための上書きが
 * 増えていく。
 *
 * breakpoint は Tailwind の既定（`sm` 40rem / `md` 48rem / `lg` 64rem / `xl` 80rem /
 * `2xl` 96rem）をそのまま使う。ここでは 1 → 2 → 3 カラムへ増やしている。**Storybook の
 * canvas 幅ではなく browser の窓を狭めると切り替わる。**
 */
export const ResponsiveColumns: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <main>
      <ContentContainer className="flex flex-col gap-4 py-6">
        <PatternLabel>grid gap-4 sm:grid-cols-2 lg:grid-cols-3</PatternLabel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SampleCard title="一件目">狭い画面では縦に積む。</SampleCard>
          <SampleCard title="二件目">sm から二列になる。</SampleCard>
          <SampleCard title="三件目">lg から三列になる。</SampleCard>
          <SampleCard title="四件目">列数だけが変わり、中身は同じ。</SampleCard>
        </div>
      </ContentContainer>
    </main>
  ),
};

/**
 * 器の幅で切り替える。`@container` を付けた親の幅を `@md:` などが見るため、viewport が
 * 広くても**割り当てられた幅が狭ければ**縦に積む。
 *
 * 使い分けは、ページの骨格・app shell が viewport breakpoint、置かれる場所によって幅が
 * 変わる再利用 component が container query である。後者を viewport で書くと、同じ
 * component を本文へ置いたときと狭い脇へ置いたときで指定が食い違う。
 *
 * 下の枠は右下を掴んで**幅を変えられる**。窓の幅は変えずに切り替わることを確かめられる。
 */
export const ContainerColumns: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <PatternLabel>@container の内側で @md:grid-cols-2 — 枠の右下を掴んで幅を変える</PatternLabel>
      <div className="@container w-80 max-w-full min-w-64 resize-x overflow-auto rounded-md border border-border p-4">
        <div className="grid gap-4 @md:grid-cols-2">
          <SampleCard title="一件目">器が狭いあいだは縦に積む。</SampleCard>
          <SampleCard title="二件目">器が @md を超えると二列になる。</SampleCard>
        </div>
      </div>
    </div>
  ),
};

/**
 * scroll しても残す header / footer。**帯は全幅、中身は読み幅**にする。帯そのものを
 * `ContentContainer` で包むと、背景と罫線まで読み幅で切れて画面の端に隙間が残る。
 * 全幅の帯の**内側**へ `ContentContainer` を置くと、背景は端まで伸び、中身だけが本文と
 * 同じ縦線に乗る。
 *
 * 重なる以上、面は必ず不透明にする（`bg-background`）。`z-10` は一覧の中の重なりより上、
 * overlay（`z-50`）より下に置くための値で、`SelectionToolbar` の sticky と同じ段に揃えて
 * いる。
 *
 * ここでは story の中で完結させるため高さを区切った領域を scroll させている。実際の
 * ページでは scroll する器が viewport になり、指定は同じまま効く。
 */
export const StickyHeaderAndFooter: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="h-96 overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-border bg-background">
        <ContentContainer className="flex items-center justify-between py-3">
          <span className="font-bold">サンプル</span>
          <Button size="sm" variant="outline">
            保存
          </Button>
        </ContentContainer>
      </div>
      <main>
        <ContentContainer className="flex flex-col gap-4 py-6">
          <PatternLabel>
            sticky top-0 z-10 bg-background — 帯は全幅、中身は ContentContainer
          </PatternLabel>
          {SCROLL_SAMPLE_TITLES.map((title) => (
            <SampleCard key={title} title={title}>
              scroll しても上下の帯は残り、本文と縦線が揃ったままになる。
            </SampleCard>
          ))}
        </ContentContainer>
      </main>
      <div className="sticky bottom-0 z-10 border-t border-border bg-background">
        <ContentContainer className="flex items-center justify-end gap-2 py-3">
          <Button size="sm" variant="outline">
            取り消し
          </Button>
          <Button size="sm">確定</Button>
        </ContentContainer>
      </div>
    </div>
  ),
};

/**
 * ページ 1 枚の組み立て。`main` は幅を絞らず、読み幅と左右余白は `ContentContainer` が持ち、
 * 先頭ブロックは `PageHeader` が持つ。**その内側の細分化だけが、ページごとに変わる部分**で
 * ある。
 *
 * ここでは本文と脇を `lg:grid-cols-[1fr_18rem]` で分け、狭い画面では脇が本文の下へ回り込む。
 * この段組みを component として切り出さないのは、ページごとに違うものを共通化しても
 * 利用側が毎回 props で作り分けることになり、utility で書くのと変わらないためである。
 */
export const PageComposition: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <main>
      <ContentContainer>
        <PageHeader>
          <PageHeaderTitle>レイアウトの合成例</PageHeaderTitle>
          <PageHeaderDescription>
            外周と先頭ブロックは共通で、内側の段組みだけがページごとに変わります。
          </PageHeaderDescription>
          <PageHeaderActions>
            <Button variant="outline">複製</Button>
            <Button>編集</Button>
          </PageHeaderActions>
        </PageHeader>
        <div className="grid gap-6 pb-6 lg:grid-cols-[1fr_18rem]">
          <div className="flex flex-col gap-4">
            <MediaImage
              alt="サンプル画像"
              aspectRatio={MEDIA_IMAGE_ASPECT_RATIO.WIDE}
              className="rounded-md"
              src={SAMPLE_ITEM_URLS[0]}
            />
            <SampleCard title="本文">
              主導線の内容を置く。狭い画面では脇より先に読まれる。
            </SampleCard>
          </div>
          <aside className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>補足</CardTitle>
                <CardDescription>本文を読むうえで必須ではない情報。</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                狭い画面では本文の下へ回り込む。
              </CardContent>
            </Card>
          </aside>
        </div>
      </ContentContainer>
    </main>
  ),
};

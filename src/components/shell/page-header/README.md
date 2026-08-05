# PageHeader

## 用途

ページ先頭で、そのページが何かと主要な操作を示します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `PageHeader` | 先頭ブロックの枠です。タイトルと説明を左、操作を右へ配置します。 |
| `PageHeaderTitle` | そのページの名前です。`h1` として描画します。 |
| `PageHeaderDescription` | タイトルを補う一文です。 |
| `PageHeaderActions` | ページ全体に対する主要な操作を置く領域です。 |

## 利用ケース

一覧・詳細・設定など、タイトルと主要操作を持つページの先頭に置きます。[`ContentContainer`](../content-container/README.md) の直下が定位置です。

説明も操作も省略できます。省略した場合はその行が詰まるだけで、残りの配置は変わりません。

## 責務境界

**左右余白を持ちません。** 余白は `ContentContainer` が所有しており、ここで重ねると本文と先頭ブロックで縦線が揃わなくなります。

**`main` の内側に置いてください。** `header` 要素は `main` / `article` / `aside` / `nav` / `section` の外にあると `banner` landmark になり、サイト全体の header を名乗ってしまいます。`ContentContainer` を `main` の内側に置く限り、この条件は自然に満たされます。

本文の構造とデータ取得は持ちません。表示する文言は呼び出し元が決めます。

配置は grid で、タイトルと説明を左の列へ積み、操作を右の列へ置きます。子を包む要素を足さずに済ませるため、各 subcomponent が自分の位置を持ちます。狭い画面では DOM の順に縦へ積みます。

`PageHeaderTitle` はページに 1 つだけ置きます。見出し階層の起点になるため、装飾目的では使いません。

`PageHeaderActions` に置くのはページ全体に対する操作だけです。特定の行や項目に対する操作は、その対象の近くへ置きます。狭い画面では回り込んで縦を占有するため、数を絞り、副次的なものは `DropdownMenu` へまとめます。

Server Component として使えます。`PageHeaderActions` に client island を置く場合も、境界を持つのはその部品だけです。

## Storybook とテスト

Storybook は `ContentContainer` と組んだ既定の構成、説明を省いた場合、操作を持たない場合、読み幅を超える viewport での中央寄せを確認します。テストは `h1` が見出し階層の起点になること、先頭ブロックが `header` 要素であること、説明と操作を省いても成立すること、左右余白を持たないこと、`className` を受け付けること、a11y 自動検査を確認します。

landmark の検証はテストに含めていません。jsdom と testing-library の role 計算は `header` を無条件に `banner` とみなし、HTML が定める landmark のスコープ規則（`main` の内側では landmark にならない）を再現しないためです。実ブラウザでの確認は Storybook で行います。

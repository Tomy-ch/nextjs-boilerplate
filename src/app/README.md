---
imports-allowed: [features, components, capabilities, stores, adapters, errors, logging, config, model]
forbidden: [business-logic, direct-fetch]
test-requirement: route
coverage-exclusions:
  - "src/app/**/page.dev.tsx"
  - "src/app/**/page.tsx"
  - "src/app/fonts.ts"
---

# app

App Router の driving adapter です。`page.tsx` と `layout.tsx` は feature を薄く呼び出し、route handler は `adapters/server` を介して外部接続します。

## 受け入れるもの

- route segment、route handler、metadata と layout への横断 UI / Provider の mount
- Next.js が規定する特殊ファイルと route segment

## 受け入れないもの

- 業務ロジック、画面ユースケースの編成、route segment からの直接 fetch

## 現在の実装の位置づけ

**この層の現在の中身は足場であり、画面実装の段階で全面的に置き換わります。** route segment・layout の構成・metadata の値は、app shell の情報設計と画面一覧が確定した時点で作り直す前提です。

そのため、いまここに情報設計を先取りした構造を作りません。今すぐ必要な配線だけを最小限で置き、判断が要る部分は画面実装まで持ち越します。この層を読むときは、**構造の参考にはせず、mount の作法だけを参考にしてください**。

現時点で足場として置いてあるもの。

| 対象 | 現状 | 置き換わる契機 |
| --- | --- | --- |
| `layout.tsx` の html / body | 言語と font 変数、`min-h-full` の骨格のみ | app shell の実装 |
| `fonts.ts` | `next/font` の書体定義と、変数を配る class 名 | どの要素にどの書体を当てるか（token と部品が持つ） |
| `metadata` の `title` / `description` | リポジトリ名と一行説明の**仮値**。`title.template` の雛形だけが恒久的な枠 | fork 先または画面実装 |
| `metadata` の `metadataBase` | **未設定**。公開 URL を保持する config が無いため | 公開 URL を config へ足す時点 |
| `page.tsx` | 動作確認用の最小ページ | 画面実装 |

## 運用

- **`route` の宣言が掛かるのは route segment の合成（`page.tsx` / `layout.tsx`）です**。
  **Route Handler（`api/**/route.ts`）は `integration` として扱います** ——
  [0090](../../docs/adr/0090-testing-strategy.md) の層別責務表が integration を「HTTP 境界のみ
  （`adapters` の API クライアント / route handler の境界）」と定めており、器の合成ではなく境界の
  検証だからです。実際の書き方も、モジュール境界を `vi.mock` で差し替え、応答の status と形を
  確かめる形になります

- **Server Action（`actions.ts`）は `unit` として扱います** —— 器の合成でも HTTP 境界でもなく、
  **値を返す対象**だからです（[0090](../../docs/adr/0090-testing-strategy.md) の軸は subject が
  何を返すかで決まり、`正常系` / `異常系` のコメント区切りで割ります）。書き方は、主体を断言する
  session と呼び先の adapter をモジュール境界で差し替え、**返した `ActionState` の分類・成立時の
  再検証・送り先**を確かめる形になります。HTTP の往復は adapter 側のテストが持つので、ここでは
  持ちません

- **受け口の本体を隣へ出したモジュールは `unit` として扱います** —— `route.ts` / `actions.ts` が
  薄い口に留まり、判断と組み立てを隣のモジュールへ委ねた場合、そのモジュールは呼び出し元を問わず
  `unit` です。判定は**応答（`Response` とステータスコード）の組み立てを持つかどうか**で、持たずに
  値を返すならこちらに当たります（`dev/session/authorize-development-session.ts`）。`Request` を
  引数に取るかどうかでは決まりません —— 受け取っていても、返すのが値なら軸は
  `正常系` / `異常系` です

- 層をまたぐ import は `@/*` alias を使う
- 役割を示さない `common`、`shared`、`utils`、`lib` 等の置き場は作らない
- 単一 feature 専用のコードは `features/<name>/` に置く
- 横断 UI と Provider を mount してよいのは `layout.tsx` だけで、`page.tsx` は feature のみを呼ぶ。mount は**配置だけ**を意味し、layout で hook を呼んでデータを組むことは含まない
- root layout は横断通知の Provider を mount する。通知を出す側は `useToast()` を呼ぶだけでよく、queue の state も dismiss の配線も持たない。ただし 1 画面で完結する表示状態を、ここを経由してグローバルへ持ち上げない
- metadata は Metadata API で宣言する。`<head>` の手書きと `next/head` は使わない。root は雛形の枠だけを持ち、各 segment はそこからの差分を宣言する

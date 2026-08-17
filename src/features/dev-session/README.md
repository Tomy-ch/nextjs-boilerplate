---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging]
forbidden: [features]
test-requirement: feature
---

# dev-session

IdP を通さずに session を発行し、保護された画面へ入るための開発用画面です。

## 受け入れるもの

- 発行する session の指定（誰として / 役割 / 失効までの秒数 / 載せる Access Token）の入力と検証
- いま持っている session の表示と、それを捨てる操作の見せ方

## 受け入れないもの

- session の封緘と復元（`adapters/server/auth` の領分。触れてよいのは app 層です）
- 口を開けてよい環境の判定（`config` が持ち、route と Server Action が当てます）
- 実在の IdP との往復（この画面はそれを通らないための画面です）

## 構成

| ファイル | 役割 |
| --- | --- |
| `paths.ts` | この画面のルートと、戻り先の既定・受け渡しの名前 |
| `parse-session-form.ts` | 送信された `FormData` を発行に渡せる形へ解く |
| `form-state.ts` | 2 つの操作の戻り値の型と、route から渡される送信先の型 |
| `view.tsx` | いまの session と発行の指定を縦に並べる |
| `ui/current-session/` | いまの session の表示と、捨てる操作 |
| `ui/session-form/` | 発行の指定。client island |

## 設計上の判断

**送信先はこの画面が決めません。** session の封緘は `adapters/server/auth` の領分で、そこへ触れて
よいのは app 層です（`architecture.ts` の `adapters-auth`）。したがって Server Action は
`src/app/dev/session/actions.ts` にあり、この画面は受け取った送信先を `useActionState` へ渡すだけです。

**開ける環境の判定は入口ごとに置きます。** route（画面）と Server Action は別々の入口で、Server Action は
画面を経由せずに呼べます。片方だけ閉じても閉じたことになりません。

**Access Token は画面に出しません。** ブラウザから観測できないことが session をこの形にしている理由
そのもの（[0079](../../../docs/adr/0079-auth-frontend-seam.md)）で、確かめるために出すとその性質を
自分で壊します。貼る欄はあっても、貼った値を読み返す欄はありません。

**失効までの秒数を指定できます。** 失効したあとに保護された画面がどう見えるかを、待たずに踏める
ようにするためです。

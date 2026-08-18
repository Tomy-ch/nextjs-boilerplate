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

## 使い方

**この画面は開発と CI の手元の宛先でだけ開きます。** production build には route ごと入りません。

### 1. モックで画面の動きを見る

```bash
APP_ENV=ci pnpm dev
```

バックエンドを起動せずに済みます（`APP_API_MODE=mock`）。`/dev/session?returnUrl=/checkout` のように
戻り先を付けて開き、誰として・どの役割で入るかを決めて「この内容で入る」を押すと、その画面へ着地します。
**Access Token は空欄で足ります** —— モックには Bearer を検証する先がありません。

契約から生成したモックの応答は毎回値が変わるため、明細に事情が立っていることがあります。
**確定まで押したい場合は実データで通してください。**

### 2. 実データで通す

```bash
APP_ENV=local pnpm dev
```

バックエンドを起動したうえで、その発行口で取った Access Token を「Access Token（任意）」へ貼ります。
IdP のリダイレクトを通らずに、実データの保護画面へ入れます。**通常のログイン（`/api/auth/login`）が
使えるならそちらが正**で、この欄はリダイレクトを通せないとき（登録済みの戻り先と手元のポートが
噛み合わない等）の代わりです。

### 3. 失効の見え方を確かめる

「失効までの秒数」を短くして入り、その秒数を過ぎてから保護された画面を開きます。**戻り先を付けた
ログイン画面へ送られます**（実測）。待たずに踏めるのがこの欄の目的です。

### 4. 別の主体で見る

「session を捨てる」で cookie を落としてから入り直します。捨てずに入り直しても上書きされますが、
捨てた状態の画面（未認証で保護ルートを踏んだときの挙動）も確かめられます。

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

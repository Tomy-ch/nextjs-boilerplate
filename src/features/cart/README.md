---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging]
forbidden: [features]
test-requirement: feature
---

# cart

選んだ商品を持ち回り、いつでも見られるようにする画面スライスです。

## 受け入れるもの

- カートの表示（脇に常設する領域、狭い幅で被せる領域、header の点数、明細 1 行の操作）
- 明細から導ける表示値（小計）

## 受け入れないもの

- カートの状態そのもの（[`stores/cart-store.ts`](../../stores/cart-store.ts) が持ちます）
- 商品の取得・商品詳細の表示（`products` の領分。feature 間で直接参照しません）
- 在庫や価格の確定（バックエンドの領分）

## 構成

画面が 1 つなので画面ディレクトリを省き、表示だけを `ui/` に分けています（[0027](../../../docs/adr/0027-directory-structure.md)）。

| ファイル | 役割 |
| --- | --- |
| `total.ts` | 明細の小計。decimal 文字列のまま整数で合算する |
| `ui/contents/` | カートの中身（小計・導線・明細）。器を持たず、置き場所は呼び出し元が決める |
| `ui/panel/` | 中身を脇に常設する領域。空なら描画しない。広い幅だけ |
| `ui/header-action/` | header に置く入口。広い幅は点数だけ、狭い幅は被せる drawer の引き手 |
| `ui/count/` | header に出す点数 |
| `ui/quantity-stepper/` | 明細 1 行の数量増減 |

## 運用

- **状態は `stores` カーネルに置きます**。商品側の「カートに追加」とこの feature の表示が同じ状態を
  読むためで、どちらかの feature に置くと相手が参照できません（[0023](../../../docs/adr/0023-stores-kernel.md)）
- **金額は decimal 文字列のまま合算します**。理由は [`total.ts`](total.ts) が持ちます
- **mount は `(shop)/layout.tsx`** です。どの画面から追加しても同じ場所に出る必要があるため、
  画面ごとには置きません（[0026](../../../docs/adr/0026-layout-shell-mount.md)）
- **中身の置き場所は幅で変えます**。脇に常設できる幅では常設し、できない幅では本文へ被せます。本文の
  下へ積むと内側のスクロールが外側のスクロールを奪い、本文へ戻れなくなるためです。中身は
  `ui/contents/` に 1 つだけ持ち、置き場所の違いは器の側で吸収します
- **数量の上限は在庫数**で、判定は [`stores/cart-store.ts`](../../stores/cart-store.ts) が持ちます。
  この feature は上限に達したことを表示に反映するだけです
- **上限に達した操作は押せなくします**。押しても何も起きない操作を残すと、反応が無いのか上限なのかが
  利用者から区別できません。商品側の「カートに追加」も同じ理由で、在庫ぶんすべて入った時点で押せなく
  なります

# 根の外枠（画面要件）

> 機能要件は [`layout.function.md`](layout.function.md)。

すべての画面を包む一番外側の器。描くものは同意を尋ねる面だけで、header も footer も持たない
——それらは route group ごとの器が置く。

## 同意を尋ねる面

画面の下端に横いっぱいで張り付き、背面を半透明の膜で覆う。

| 区画 | 内容 |
| --- | --- |
| 見出し | 何について尋ねているか |
| 説明 | 必要なものと任意のものの区別が読み取れる文 |
| 導線 | 判断の材料を示す文書へ（置かない構成も選べる） |
| 操作 | 「同意する」と「必要なものだけ使う」の 2 つ |

**2 つの操作を同じ大きさで並べる。** 拒否だけを小さくしたり、目立たない見た目にしたりしない。
選びにくくすると、得られた同意が自由に与えられたものでなくなる。

**閉じる操作を置かない。** 面から出る手段は選ぶことだけである（[`layout.function.md`](layout.function.md)）。

**狭い画面では説明と操作を縦に積む。** 横に並べると、説明が読めない幅まで詰まる。

**文言はこの器が持たない。** 何にどの cookie を使うかは繋ぐ製品で、どこまで書くかは法域で変わる
ため、書き換える場所を 1 つに寄せてある（`components/**/README.md`）。

## 面が出る時点

**読み込み直後には出ない。** ブラウザ側で同意状態を読み終えてから現れる（理由は
[`layout.function.md`](layout.function.md)）。

## 関連

- 実装 `src/app/layout.tsx` / `src/app/consent.tsx`
- 部品 [`ConsentBanner`](../../../src/components/shell/consent-banner/README.md) —— Storybook `Overlay/ConsentBanner`

# `stores` カーネル(横断 client 状態)

[0020](0020-adopted-architecture.md) の **機能スライス × 表示層カーネル** アーキテクチャに、11 個目のカーネル **`stores`** を追加し、その **責務 / 依存 / `"use client"` 不変条件 / 採用ライブラリ / 昇格基準** を定める。

[0060](0060-state-management.md) は「Server state = RSC fetch 既定 / Client state = local から / グローバル状態ライブラリ非同梱」を定めたが、**バッテリー同梱への転換(v1・[master-plan §1.2](../plan/master-plan.md))で横断する client 状態を扱うライブラリ(Zustand)を採用**するにあたり、**複数 feature が共有する横断 client 状態を置く家が無い**問題(`capabilities` の横断 hook と同型のギャップ)を本 ADR が解消する。「実質のあるカーネルは自前 ADR を持つ」定石([0022](0022-capabilities-kernel.md) capabilities と同型)に従い独立させる。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。内容自体はこの設計討議でユーザ確定済み。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きする）

## 背景

[0021](0021-frontend-responsibility.md) の**昇格ルール**(横断要素を `model` / `components` / `adapters` / `capabilities` のいずれかへ)には、**横断する client *状態*(stateful store)の出口が無い**。`capabilities` は runtime 能力を供給する reactive hook 限定で、アプリ状態ストアの家ではない。ユーザ決定(2026-07-14): **横断性(複数 feature が共有)がある client 状態 → `stores` カーネル / 非横断(単一 feature 内)→ feature 内**([0021](0021-frontend-responsibility.md) 昇格ルールと同型)。

## 決定

### 責務

`stores` は、**複数 feature が共有する横断 client 状態**(Zustand ストア)を置くカーネルである。

- **既定は [0060](0060-state-management.md) のまま**: server state = RSC fetch / 単一 feature の client 状態 = feature 内 local state(`useState` / `useReducer`)。**真に横断する client 状態のみ `stores` へ昇格**する(受入基準 = 複数 feature 参照)。
- 採用ライブラリ = **Zustand**(軽量・de-facto。[0010](0010-standards-and-non-lockin.md) §1 標準準拠)。ストアは `"use client"`。

### `"use client"` 不変条件

`stores` は **client-only(`"use client"`)固定**。server state([0071](0071-bff-api-integration.md) の RSC/adapters)とは別軸で、ブラウザ上のセッション/UI 横断状態(選択状態・ウィザード・グローバル UI トグル等)を扱う。server から来たデータは RSC が props で渡し、store は client の相互作用状態を保持する(server state を store に二重持ちしない)。

### 受け入れないもの

- **server state**(→ RSC fetch / [0071](0071-bff-api-integration.md) adapters)。store に API レスポンスを二重キャッシュしない
- **単一 feature の状態**(→ feature 内 local state。昇格しない)
- **UI マークアップ**(→ `components`)/ `serverConfig` / secret / 業務ロジック(バックエンド責務。[0011](0011-no-docker.md))
- **ポリシー状態**(consent/flag は各 seam。[0031](0031-policy-state-supply.md))

### 依存

| 層(import する側) | 許可される import 先 |
| --- | --- |
| `stores` | `model` / `errors`(`config/client` の NEXT_PUBLIC リテラルは可)。`"use client"` |
| `features` | 既存 + **`stores`** |

- **`components` は `stores` を import しない**(純 UI・props-in を維持。合成は feature)
- **昇格ルールに 5 つ目の出口を追加**: 横断する client 状態 → `stores`([0021](0021-frontend-responsibility.md))

### 移植性 / 非ロックイン([0010](0010-standards-and-non-lockin.md))

Zustand は de-facto の軽量 store で、`create()` + hook の標準形に乗る(vendor-independent = ストア API は React 慣用の hook で、Zustand を抜いても「横断 client 状態を hook で読む」構造は可搬)。ストアを feature/component に直書きせず `stores` に集約することで差し替え可能に保つ。exact-pin + `pnpm audit`([0004](0004-library-management.md))。

## 禁止事項

- ❌ `stores` に server state(API レスポンス)を二重キャッシュすること(server state は RSC/adapters)
- ❌ 単一 feature の状態を `stores` へ上げること(横断性が無ければ feature 内 local)
- ❌ `components` が `stores` を import すること(合成は feature 経由)
- ❌ `stores` に UI マークアップ / secret / `serverConfig` / 業務ロジックを置くこと
- ❌ Zustand ストアを feature/component に直書きして横断参照させること(横断は `stores` へ集約)

## 補足

- **採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**(独立起票)。
- **既存 ADR への反映は最終整理フェーズのバッチ**: [0020](0020-adopted-architecture.md)(10→11 カーネル)/ [0021](0021-frontend-responsibility.md)(責務・依存マトリクス・昇格 5 出口目)/ [0027](0027-directory-structure.md)(構造図)/ [0060](0060-state-management.md)(「グローバル状態非同梱」→「横断は stores〈Zustand〉/ 既定は local」へ反転)。
- 本カーネルは v1 バッテリー同梱(Zustand 採用)の家。v1 での 0060 反転と対で確定する。

## 関連 ADR

- [0060-state-management.md](0060-state-management.md) — 状態管理方針(server=RSC / client=local 既定。本 ADR が横断 client 状態の家を追加し、v1 で Zustand 採用へ反転)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — 横断 client hook カーネル(本 ADR と同型の独立カーネル)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — server state(RSC/adapters。store と二重にしない境界)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — 昇格ルール(横断 client 状態 → stores の出口を追加)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — Zustand 標準準拠 + 差し替え可能性
- [master-plan §1.2 採用ロードマップ](../plan/master-plan.md) — v1 バッテリー同梱(Zustand 採用)の全体像

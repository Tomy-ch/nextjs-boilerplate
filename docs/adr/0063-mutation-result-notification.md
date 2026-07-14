# 変更結果の通知 UX(インライン / トースト / redirect・live region)

変更系操作の**結果通知 UX** を 1 本に定める。操作結果を **インライン / トースト / redirect + メッセージ** のどれで出すかを「**フォーム文脈に留まるか離れるか**」で使い分ける規約と、非同期の状態変化を支援技術へ伝える **live region a11y**(目標水準の権威は [0100](0100-accessibility-target.md))を定める。送信メカニクス([0061](0061-form-mutation-ux.md))の `ActionState` 契約を入力に通知手段を選ぶ層である。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。本 ADR は元 [0061](0061-form-mutation-ux.md)(フォーム・ミューテーション UX)を「1 ADR = 1 主題」方針で per-subject 分割した際、**変更結果の通知 UX(triage #19)**を独立起票したもの。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

[0052](0052-ui-component-policy.md)(B2)が UI / form コンポーネント群を意図的な exclusion とした裏面として、「**ライブラリなしで操作結果をどう出すか**」(triage #19 通知 UI 使い分け)が空白として残る。成功 / 失敗の通知手段が feature ごとにばらつくと、実装者にも利用者にも一貫した UX が失われる。

triage 上、#19 の native 管轄は [0080](0080-error-handling.md)(エラー正規化)/ [0052](0052-ui-component-policy.md)(UI)/ [0100](0100-accessibility-target.md)(a11y)に分かれる。結果通知は送信メカニクス([0061](0061-form-mutation-ux.md))が返す `ActionState` を入力に、「フォーム文脈に留まる結果か離れる結果か」で手段を選ぶ層である。本 ADR はその使い分けの規約と live region a11y 要件を敷き、a11y の目標水準は [0100](0100-accessibility-target.md) に委ねる。

本 ADR は decision 分類([0140](0140-documentation-operations.md))である。

## 決定

### 1. 通知手段の使い分け(フォーム文脈に留まるか離れるか)

通知手段は戻り値契約(`ActionState`。[0061](0061-form-mutation-ux.md))と「**フォーム文脈に留まるか離れるか**」で選ぶ:

| 手段 | 用途 | 供給元 |
| --- | --- | --- |
| **インライン**(フィールド / フォーム近傍) | 入力検証エラー・フォーム固有のエラー。フォーム文脈に留まる結果の既定 | `ActionState` の fieldErrors / formError(正規化済み sentinel。[0080](0080-error-handling.md)) |
| **トースト** | フォーム文脈を離れた ephemeral な操作結果(遷移を伴わない保存成功等) | `ActionState` の成功値 |
| **redirect + メッセージ** | 成功後に別画面へ遷移する結果(PRG) | Server Action の `redirect()` + 再検証([0071](0071-bff-api-integration.md) `revalidateTag` / `revalidatePath`) |

- インラインに出す入力検証エラーの供給・検証タイミングは [0062](0062-form-input-validation.md) が管轄する。本 ADR はそれを**どの手段で表示するか**の使い分けを持つ

### 2. トースト UI の帰属

- **トースト UI の帰属**:トーストは**自前最小 UI** として `components` カーネルが持つ([0021](0021-frontend-responsibility.md)「`components` はトースト等の UI 状態を持てる」で帰属確定済み)。UI / form ライブラリ非同梱([0052](0052-ui-component-policy.md))と矛盾しない(**ライブラリ導入ではなく自前最小 UI**)
- 本 ADR はトースト *コンポーネント* を再帰属させず、**使い分けの規約**と下記 a11y 要件を持つ

### 3. a11y(live region・権威は [0100](0100-accessibility-target.md))

- トースト・非同期の状態変化は視覚のみでは支援技術に伝わらないため、**live region(`role="status"` / `role="alert"` / `aria-live`)で通知する**。インラインエラーはフィールドと `aria-describedby` / `aria-invalid` で関連付ける
- a11y の**目標水準・検査タイミングの権威は [0100](0100-accessibility-target.md)**(WCAG 2.x AA / biome a11y 静的検査 + 実装 PR 時の手動チェック)。本 ADR は「**通知 UI は live region を伴う**」ことを結果通知 UX の必須要件として敷くに留め、水準を再定義しない(二重管理回避)

## 禁止事項

- ❌ 通知手段(インライン / トースト / redirect)の使い分けを feature ごとにばらつかせること
- ❌ トースト等の非同期通知を live region なしで出すこと(支援技術に伝わらない = [0100](0100-accessibility-target.md) 違反)
- ❌ トースト UI を `components` 以外へ置く / UI ライブラリ持ち込みで代替すること([0021](0021-frontend-responsibility.md) 帰属 / [0052](0052-ui-component-policy.md) exclusion)

## 補足

- **分割の家**:本 ADR は元 [0061](0061-form-mutation-ux.md) から #19 を分離したもの。native 管轄は [0080](0080-error-handling.md)(エラー供給元)/ [0052](0052-ui-component-policy.md)(トースト UI 帰属)/ [0100](0100-accessibility-target.md)(a11y 水準)に分かれるが、送信フロー UX の一部としての通知手段使い分け規約は本 ADR が束ねる。最終整理フェーズで #19 を [0080](0080-error-handling.md) 追補等へさらに寄せ直す余地がある(本 ADR は独立起票)
- 本 ADR は [0140](0140-documentation-operations.md) タクソノミーで **decision** 分類。日常強制の細則(トースト表示秒数・文言トーン等)は `rules.md` 新設時にそちらへ寄せる

## 関連 ADR

- [0061-form-mutation-ux.md](0061-form-mutation-ux.md) — 送信メカニクス(本 ADR が入力に選ぶ `ActionState` 契約の供給元)
- [0062-form-input-validation.md](0062-form-input-validation.md) — 入力検証 UX(インラインに出すフィールドエラーの供給元・元 0061 の姉妹分割)
- [0080-error-handling.md](0080-error-handling.md)(B6)— errors sentinel / 境界正規化(`ActionState` が運ぶエラーの供給元・#19 の native 管轄の一部)
- [0052-ui-component-policy.md](0052-ui-component-policy.md)(B2)— UI / form コンポーネント exclusion(自前最小トーストの前提)
- [0100-accessibility-target.md](0100-accessibility-target.md)(C2)— a11y 目標(live region 要件の権威)
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— Server Action / 再検証(redirect 通知・ミューテーション後反映の連動)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md)(A3)— `components`(トースト UI 帰属)
- [0140-documentation-operations.md](0140-documentation-operations.md)(D1)— ドキュメントタクソノミー(本 ADR = decision)

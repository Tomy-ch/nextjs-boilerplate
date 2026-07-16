# フォーム送信フローの canonical 機構(`<form action>` + `useActionState` + `useFormStatus`)

変更系フローの **送信メカニクス**を 1 本に定める。`<form action={serverAction}>` + `useActionState`(結果 state)+ `useFormStatus`(pending)を canonical な送信フローの既定形とし、戻り値契約 `ActionState<T>` を「入力検証 UX / 結果通知 UX が共通に依拠する器」として敷く。[0060](0060-state-management.md) は form state に react-hook-form + zod を **v1 採用**するが、rhf はクライアント入力検証を担い、**送信そのものは本 ADR の Server Actions 機構に合流させる**(送信機構は 1 本)。標準([0010](0010-standards-and-non-lockin.md))に乗る送信メカニクスの土台を提供する。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。本 ADR は triage から**独立に起票**したものである。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

> **分割済み**:本 ADR は当初「入力検証・結果通知」まで束ねていた(旧題「フォーム・ミューテーション UX」)が、ユーザ方針「1 ADR = 1 主題(厳密)」に従い per-subject へ分割した。本 ADR は**送信メカニクス(送信フローの canonical 形・`ActionState` 契約・pending 表示)**に縮約し、以下を分離した。
>
> - **入力検証 UX(triage #10)** → [0062](0062-form-input-validation.md)
> - **変更結果の通知 UX(triage #19)** → [0063](0063-mutation-result-notification.md)

## 背景

[0060](0060-state-management.md)(B5)は form state に **react-hook-form + zod を v1 採用**し、[0052](0052-ui-component-policy.md)(B2)は UI / form 部品(shadcn 系)を v1 採用したが、rhf が担うのは**クライアントの入力状態・検証**であって「**サーバへどう送信し、結果を返すか**」という送信メカニクスは別レイヤであり、その既定が空白として残る。boilerplate で最頻出の UI であるフォームが、送信の骨格すら規約なしでは feature ごとに発明され(`onSubmit` 内での手 fetch / rhf の `handleSubmit` から独自 POST 等に分岐)、[0062](0062-form-input-validation.md) の入力検証も [0063](0063-mutation-result-notification.md) の結果通知も、乗る先の器がなければ統一できない。

送信メカニクスは入力検証・結果通知の**共通の土台**である。両者は戻り値契約(`ActionState`)を入力に選ぶため、まず「送ってから結果が返るまでの骨格」を 1 本に固定する必要がある。本 ADR はその骨格のみを担い、送信前の入力検証 UX は [0062](0062-form-input-validation.md)、送信後の結果通知 UX は [0063](0063-mutation-result-notification.md) が担う。rhf との関係は「rhf = クライアント入力検証 / 送信 = 本 ADR の `<form action>` + Server Action」に切り分け、送信機構を二重化しない。

[0010](0010-standards-and-non-lockin.md) の標準準拠に従い、送信フローは React 19 / App Router のデファクト(`<form action>` + `useActionState` + `useFormStatus`)に乗る。本 ADR は decision 分類([0140](0140-documentation-operations.md))であり、標準に乗る決定として vendor-independent な正当性材料を本体に添える。

## 決定

### 1. 送信フローの canonical 形(デファクトに乗る)

- `<form action={serverAction}>` + `useActionState`(結果 state)+ `useFormStatus`(pending)を送信フローの**既定形**とする。Server Action は feature 内 `actions.ts` に置き、編成のみを行う([0021](0021-frontend-responsibility.md) / [0040](0040-routing-rendering-strategy.md))。`"use client"` は入力を扱う葉へ押し下げる([0040](0040-routing-rendering-strategy.md))
- **vendor-independent 正当性材料**([0010](0010-standards-and-non-lockin.md) §2):progressive enhancement(JS 無効でも `<form>` が送信される)/ PRG(Post-Redirect-Get は web-platform の確立パターン)/ pending・結果 state の一元化。運用テスト =「React / Next.js を正当化から抜いても、サーバ往復する form は『標準 HTTP form + 進捗表示 + 結果表示』として成立するか?」→ Yes。ゆえにデファクトに乗っても縛られていない

### 2. 戻り値契約 `ActionState<T>`(入力検証・通知が共通に依拠する器)

- 戻り値契約 `ActionState<T>`(フィールドエラー / フォームエラー / 成功値)は `model` が所有する**表示結果型**([0021](0021-frontend-responsibility.md))であり、[0080](0080-error-handling.md) の sentinel を Server Action 境界越しにシリアライズして client へ渡す器である
- **型そのものの同梱は実装フェーズ(B8)で確定**(triage #11)し、本 ADR は「**Server Action ごとに戻り値形状を発明せず、共通の `ActionState<T>` 契約に従う**」ことのみを定める(#11 を再決定しない)。入力検証([0062](0062-form-input-validation.md))が返すフィールドエラー、結果通知([0063](0063-mutation-result-notification.md))が選ぶ通知手段は、いずれもこの契約を入力に選ぶ

### 3. pending 表示(二重送信・楽観更新は #12 管轄)

- pending 表示は `useFormStatus`(submit 中の disabled / スピナー)を既定とし、送信フローの一部として要求する
- 二重送信防止(submit disabled + 冪等キー)・楽観的更新(`useOptimistic`)は triage #12(rule 管轄 / [0071](0071-bff-api-integration.md) の POST 冪等性と表裏)であり、本 ADR は pending の要求までに留める

## 禁止事項

- ❌ Server Action ごとに戻り値形状を発明すること(`ActionState<T>` 契約に従い、[0062](0062-form-input-validation.md) の入力検証・[0063](0063-mutation-result-notification.md) の共通通知を可能にする)
- ❌ 送信フローを `<form action>` + `useActionState` 以外の自前機構で発明すること(標準デファクトに乗る = [0010](0010-standards-and-non-lockin.md))
- ❌ react-hook-form 等の form state ライブラリで**送信機構そのものを置換して二重化**すること(rhf はクライアント入力検証に用い、送信は本 ADR の `<form action>` + Server Action に合流させる。[0060](0060-state-management.md) の rhf 採用と整合)
- ❌ pending 表示を伴わない送信(`useFormStatus` を既定として要求する)

## 補足

- **分割の家**:本 ADR は #10 / #19 を束ねていた元 0061 の**送信メカニクス核**である。#10(native 管轄 [0072](0072-api-type-generation.md))は [0062](0062-form-input-validation.md)、#19(native 管轄 [0080](0080-error-handling.md) / [0052](0052-ui-component-policy.md) / [0100](0100-accessibility-target.md))は [0063](0063-mutation-result-notification.md) へ分離した。3 本は「フォームを送って結果が返るまで」の 1 UX を構成するが、主題(メカニクス / 入力検証 / 結果通知)が異なるため per-subject に分けている
- `ActionState<T>` の型同梱・素の form 雛形は B 節(B8 / B2)の実装成果物で確定(triage #9 / #11)。本 ADR はそれらを前提に送信メカニクスの既定を敷く
- 本 ADR は [0140](0140-documentation-operations.md) タクソノミーで **decision** 分類(送信メカニクスの既定 = 決定)。日常強制の細則(pending スピナーの表示閾値等)は `rules.md` 新設時にそちらへ寄せる

## 関連 ADR

- [0062-form-input-validation.md](0062-form-input-validation.md) — 送信前の入力検証 UX(本 ADR から分離 / `ActionState` のフィールドエラーを供給)
- [0063-mutation-result-notification.md](0063-mutation-result-notification.md) — 変更結果の通知 UX(本 ADR から分離 / `ActionState` を入力に通知手段を選ぶ)
- [0060-state-management.md](0060-state-management.md)(B5)— form state = react-hook-form + zod 採用(v1)。rhf = クライアント入力検証 / 送信は本 ADR の Server Actions 機構に合流
- [0052-ui-component-policy.md](0052-ui-component-policy.md)(B2)— UI / form 部品(shadcn 系)採用(v1)。本 ADR は送信メカニクスを担い、UI 部品と対で機能する
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— Server Action / POST 冪等性(pending・二重送信の連動)
- [0080-error-handling.md](0080-error-handling.md)(B6)— errors sentinel(`ActionState` が運ぶエラーの供給元)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md)(A3)— `model`(`ActionState` 所有)/ `actions.ts` 編成
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md)(A4)— Server Actions / `actions.ts` 配置 / `"use client"` 押し下げ
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — 標準準拠・非ロックイン(送信フローがデファクトに乗る正当化の土台)
- [0140-documentation-operations.md](0140-documentation-operations.md)(D1)— ドキュメントタクソノミー(本 ADR = decision)

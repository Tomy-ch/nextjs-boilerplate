# フォーム入力検証 UX(client 検証・生成 zod の再利用境界)

送信前の**入力検証 UX** を 1 本に定める。表示レベルの入力検証(必須 / 形式 / 文字数など UX 用)を client でも行い即時フィードバックする既定と、**表示バリデーション規則(`model` の手書き zod スキーマ)** と **契約検証(`adapters` 境界・生成スキーマ)** の**二層分離**、および生成 zod([0072](0072-api-type-generation.md))の client 再利用の境界(具体的許容範囲は [0072](0072-api-type-generation.md) 管轄へ委譲)を定める。client 検証は [0060](0060-state-management.md) が採用する **react-hook-form + zodResolver** で行い(resolver に食わせるのは `model` の表示検証スキーマ)、送信メカニクス([0061](0061-form-mutation-ux.md))の `ActionState` 契約へフィールドエラーを供給する層である。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。本 ADR は元 [0061](0061-form-mutation-ux.md)(フォーム・ミューテーション UX)を「1 ADR = 1 主題」方針で per-subject 分割した際、**送信前の入力検証 UX(triage #10)**を独立起票したもの。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

[0060](0060-state-management.md)(B5)は form state に **react-hook-form + zod(`zodResolver`)を v1 採用**した。ただし rhf + resolver は「検証を回す機構」であって、「**どのスキーマで・どのタイミングで検証し、生成 wire スキーマとどう切り分けるか**」(triage #10)は別途規約が要る。これが空白のままだと、boilerplate で最頻出のフォーム入力が、feature ごとに検証タイミングも二重管理の扱いも不統一になる。

triage 上、#10 の native 管轄は [0072](0072-api-type-generation.md)(zod 生成物・型漏洩禁止)である。入力検証は送信メカニクス([0061](0061-form-mutation-ux.md))と結果通知([0063](0063-mutation-result-notification.md))の間に位置し、送信前の即時フィードバック UX と、生成物(wire スキーマ)を client 入力検証に再利用してよいかという型漏洩境界の判断が交差する。本 ADR は前者(入力検証 UX の既定 = どのスキーマを resolver に食わせるかを含む)を敷き、後者の具体的許容範囲は保護対象 [0072](0072-api-type-generation.md) の管轄に委ねる。

本 ADR は decision 分類([0140](0140-documentation-operations.md))である。

## 決定

### 1. client 表示検証と検証タイミング

- **入力検証を server round-trip 前提にしない**。表示レベルの入力検証(必須 / 形式 / 文字数など UX 用)は client でも行い、即時フィードバックする
- 検証タイミングの既定 = **submit 時 + 一度エラーになったフィールドは blur / change で再検証**(過剰な early error を避ける)。エラー文言は日本語(AGENTS.md Language Rules)
- 検証結果は送信メカニクス([0061](0061-form-mutation-ux.md))の `ActionState` の fieldErrors / formError として表示層へ渡る(通知手段の使い分けは [0063](0063-mutation-result-notification.md))

### 2. 検証の二層分離(表示規則 vs 契約検証)

検証を**二層に分離する**(この分離が [0072](0072-api-type-generation.md) の型漏洩禁止との整合の要):

- **表示バリデーション規則** = `model` が持つ**手書きの zod スキーマ**([0021](0021-frontend-responsibility.md)「表示バリデーション規則」)。UX 用のフィールド規則であり、**wire contract ではない**ため [0072](0072-api-type-generation.md) の型漏洩禁止の対象外。**client 入力検証(rhf の `zodResolver`)に食わせるのはこの `model` 表示検証スキーマ**であり、[0060](0060-state-management.md) が「zod スキーマを入力契約の SSOT とし client の `zodResolver` と共有する」と言う際の SSOT はこの表示検証スキーマを指す
- **契約検証** = `adapters` 境界。request は生成 request スキーマ、response は生成 response スキーマで `.parse()`([0071](0071-bff-api-integration.md) / [0072](0072-api-type-generation.md))。契約破れは正規化エラー([0080](0080-error-handling.md))として扱う。**生成 wire スキーマを rhf の resolver へ直接食わせない**のが既定(生成物を feature/`model` へ漏らさない = 型漏洩禁止)。生成 request スキーマの client 再利用可否は §3 のとおり [0072](0072-api-type-generation.md) 管轄

### 3. 生成 zod の client 再利用境界(具体的許容範囲は 0072 へ委譲)

- 生成 zod([0072](0072-api-type-generation.md))の **request-body スキーマ**を client 入力検証へ再利用してよいか(スキーマ二重管理の回避)は、[0072](0072-api-type-generation.md) の**型漏洩禁止・生成物管轄と接する**
- **本 ADR は「二重管理を避ける」原則と上記二層分離までを定め、生成スキーマを client bundle に載せる具体的許容範囲(どのスキーマを載せるか / `model` への非漏洩の担保 / bundle size 影響)は [0072](0072-api-type-generation.md) 追補 / 実装 PR に委ねる**。生成物と型漏洩の権威は [0072](0072-api-type-generation.md)(保護対象)にあり、本 ADR で先取り確定しない(「補足」参照)

## 禁止事項

- ❌ 入力検証を server round-trip でしか出さない UX(client でも表示検証する)
- ❌ 表示バリデーション規則(`model`・手書き)と生成 wire スキーマ(`adapters/gen`)を混同し、生成スキーマを `model` / feature のドメインロジックへ漏らすこと([0072](0072-api-type-generation.md) 型漏洩禁止)
- ❌ 生成 zod の client 再利用の具体的許容範囲を、本 ADR で([0072](0072-api-type-generation.md) 追補を経ずに)確定すること
- ❌ 検証タイミングを feature ごとにばらつかせること(既定 = submit 時 + エラー後フィールドの再検証)

## 補足

- **#10 の確定は [0072](0072-api-type-generation.md) 追補待ち**:生成 request スキーマの client 再利用の許容範囲は、保護対象 [0072](0072-api-type-generation.md) 本体の追補(ユーザ承認)で確定する。本 ADR Accepted はその追補のトリガー候補
- **分割の家**:本 ADR は元 [0061](0061-form-mutation-ux.md) から #10 を分離したもの。native 管轄は [0072](0072-api-type-generation.md) だが、送信フロー UX の一部としての即時フィードバック規約は本 ADR が持ち、生成物管轄の確定は [0072](0072-api-type-generation.md) へ委譲する
- 本 ADR は [0140](0140-documentation-operations.md) タクソノミーで **decision** 分類。日常強制の細則(検証タイミングの厳密値・文言トーン等)は `rules.md` 新設時にそちらへ寄せる

## 関連 ADR

- [0061-form-mutation-ux.md](0061-form-mutation-ux.md) — 送信メカニクス(本 ADR の検証結果を運ぶ `ActionState` 契約の供給元)
- [0063-mutation-result-notification.md](0063-mutation-result-notification.md) — 変更結果の通知 UX(本 ADR のフィールドエラーを表示する層・元 0061 の姉妹分割)
- [0072-api-type-generation.md](0072-api-type-generation.md)(B4)— 生成 zod / 型漏洩禁止(#10 の native 管轄・client 再利用許容範囲の確定先)
- [0071-bff-api-integration.md](0071-bff-api-integration.md)(B3)— `adapters` 境界での契約検証(`.parse()`)
- [0080-error-handling.md](0080-error-handling.md)(B6)— 契約破れの正規化エラー
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md)(A3)— `model`(表示バリデーション規則の所有)
- [0060-state-management.md](0060-state-management.md)(B5)— form state = react-hook-form + zod(`zodResolver`)採用(v1)。resolver に食わせるのは本 ADR の `model` 表示検証スキーマ(zod SSOT)
- [0140-documentation-operations.md](0140-documentation-operations.md)(D1)— ドキュメントタクソノミー(本 ADR = decision)

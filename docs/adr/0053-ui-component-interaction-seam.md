# UI コンポーネント方針とインタラクション a11y seam

[0052](0052-ui-component-policy.md) は UI コンポーネントライブラリ / アイコン / form コンポーネント群を **boilerplate 本体に同梱しない** exclusion を宣言したが、その射程は「静的な UI 部品」に閉じており、**インタラクションを持つ UI**(リッチテキスト/エディタ・複雑入力 UI・モーダル/ダイアログ・キーボードショートカット・ドラッグ&ドロップ)については「沈黙 = 未判断」なのか「exclusion」なのかを判別できなかった(triage #15 / #16 / #22 / #25 / #27。監査 [adr-gap-audit.md](../plan/adr-gap-audit.md))。本 ADR は 0052 の自前 UI 方針を **インタラクション UI へ具体化**し、その非同梱境界と **a11y 拡張点(seam)**(sanitizer port / shortcut registry seam / WCAG 2.2 ドラッグ代替 IF 等)を 1 本に束ねる。

## Status

Accepted (exclusion + a11y seam。一部に affirmative decision = native `<dialog>` 既定を含む)

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。本 ADR は triage の interaction UI クラスタ(#15 / #16 / #22 / #25 / #27)を「0052 の射程具体化 + a11y 拡張点(seam)」として 1 主題に束ねるため **独立起票**したもの。内容自体はこの設計討議に基づく。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きし、改定履歴を積まない）

## 背景

triage の遡及監査([adr-gap-triage.md](../plan/adr-gap-triage.md))は、interaction UI クラスタを次のように仕分けた:

- **#16 複雑入力 UI の帰属**(追補・0052)= 日付ピッカー等が 0052 の form コンポーネント exclusion に含まれるかの **射程確定**。曖昧なままだと実装時に「入れてよいか」の判断が毎回ユーザ確認になる
- **#15 リッチテキスト/エディタ**(除外)= 本体非同梱 + **sanitize IF + 表示 seam**(rehype/sanitize は差し替え可能な port として名前を付ける)
- **#22 モーダル/ダイアログ**(追補・0052 + 0040)= native `<dialog>` 既定 / focus trap・Escape・scroll lock 必須(0100)/ route-as-modal(intercepting routes)採否は 0040 管轄
- **#25 キーボードショートカット**(除外)= 必要になるまで持たない + **登録機構 IF**(shortcut registry の seam)
- **#27 ドラッグ&ドロップ**(除外)= 非同梱 + **WCAG 2.2 ドラッグ代替を満たす a11y 準拠 DnD seam/IF**

これらは 0052 の「用途依存だから本体で決めない」論理をそのまま継ぐ一方、**インタラクションは a11y 事故の最頻発地点**(モーダルの focus / DnD のドラッグ代替 / ショートカットの誤発火)であり、[0100](0100-accessibility-target.md) の WCAG 2.x AA 目標と直結する。純粋な「やらない宣言」で閉じると、fork 先が最初の interaction UI で a11y 契約なしに実装する余地が残る。ゆえに **exclusion に a11y 拡張点(名前付き seam + a11y 契約)を必ず敷く**。

## 決定

### 1. 貫く原則: プラットフォーム標準・built-in 優先(0010 標準準拠)

interaction UI は、**ライブラリより先にプラットフォーム標準(HTML/CSS/DOM の built-in)を第一候補とする**([0010](0010-standards-and-non-lockin.md) §1 標準準拠)。built-in で要件を満たせないと判明した時にのみ、用途依存の判断として fork 先がライブラリを足す。

- **vendor-independent 正当性材料**([0010](0010-standards-and-non-lockin.md) §2): built-in 優先は「フレームワークが推奨するから」ではなく、web プラットフォーム標準に固有の独立根拠で正当化する ——(a) top-layer / focus / `inert` / `::backdrop` 等の a11y 機構を**ブラウザが既定で供給**する(自前 focus-trap の車輪の再発明を避ける)、(b) **JS ライブラリ依存ゼロ = 任意フレームワークへ可搬**(0010 の運用テスト「ベンダーを正当化から抜いても正当か」= Yes)、(c) **最小依存**(バンドル増を伴わない)。これは 0052 の「本体は特定 UI ライブラリを前提にしない」宣言の interaction 面への延長である

### 2. 複雑入力 UI の帰属を 0052 exclusion の射程に含める(#16)

- **日付ピッカー・コンボボックス・オートコンプリート等の複雑入力 UI は、[0052](0052-ui-component-policy.md) の「form コンポーネント群」exclusion の射程に含まれる**ことを本 ADR が宣言する(0052 本体は Protected のため編集せず、本 ADR が射程を確定する)。boilerplate 本体には同梱せず、fork 先が必要になった時点で判断する
- built-in 優先(§1)により、まず native input(`<input type="date">` / `<datalist>` / `<select>` 等)を第一候補とする
- fork 先が採用する場合も、**a11y 準拠(キーボード操作 / フォーカス順序 / ARIA / [0100](0100-accessibility-target.md) の WCAG 2.x AA)を必須**とし、[0050](0050-styling-strategy.md)(Tailwind 主軸 + CSS Modules 限定許可・styled-components / emotion は非採用)・[0021](0021-frontend-responsibility.md)(カーネル配置・命名規律)・[0004](0004-library-management.md)(exact pin / audit)の枠内で行う(0052 の採用時条件と同一)

### 3. リッチテキスト/エディタ = 非同梱 + sanitizer port + 表示 seam(#15)

- **WYSIWYG / Markdown エディタ(TipTap 等)は boilerplate 本体に同梱しない**(0052 exclusion の延長)。用途依存のため fork 先判断
- ただし「表示」側には拡張点(seam)を敷く: **信頼できない HTML を安全な表示へ変換する sanitizer を、差し替え可能な named port(seam)として扱う**(rehype/rehype-sanitize / DOMPurify 等は port の実装であって本体前提ではない)。リッチテキスト表示は、この sanitizer port を必ず通す
- sanitizer port は外部ライブラリの wrap であり、物理的な置き場は [0021](0021-frontend-responsibility.md) のカーネル受入基準(複数箇所参照 or 外部ライブラリ wrap → カーネル)に従って**実装 PR で確定**する(§7)。表示 seam(sanitize 済みコンテンツの描画)は `components` / feature 内 UI に置く
- **XSS 規約との接続**: `dangerouslySetInnerHTML` の原則禁止と sanitizer 必須の**規約(rule)自体は [0110](0110-security-operations.md) が所有**(triage #48)。本 ADR は「sanitizer を差し替え可能な port として名前を付ける」構造側を敷き、規約は 0110 を正とする(二重決定しない)

### 4. モーダル/ダイアログ = native `<dialog>` 既定 + a11y 契約(#22)

- **native `<dialog>` 要素(`showModal()`)を既定**とする(§1 built-in 優先の帰結 = affirmative decision)。ポータル自前実装 / ライブラリは、native `<dialog>` で要件を満たせないと判明した場合にのみ用途依存で fork 先が採る
- 採用する modal は **a11y 契約**を満たす(native `<dialog>` が既定で供給する分 + 補う分。[0100](0100-accessibility-target.md) WCAG 2.x AA):focus trap / Escape 閉じ / 背景 scroll lock / フォーカス復帰
- **focus-trap / scroll-lock 等の UI 密着の挙動 hook は `capabilities` に上げず、その component に co-location する**([0022](0022-capabilities-kernel.md):runtime 能力ではなく UI 挙動のため)
- **route-as-modal(intercepting routes `(.)` / parallel routes `@modal`)の採否は本 ADR で確定しない**。これは URL 設計に波及するルーティング判断であり [0040](0040-routing-rendering-strategy.md) の管轄。0040 は現状 intercepting / parallel routes に未言及のため、採否は **0040 の追補で決める**(本 ADR で決めると管轄と齟齬する。§補足 / flag)

### 5. キーボードショートカット = 非同梱既定 + registry seam(capabilities)(#25)

- **グローバルキーボードショートカットは、必要になるまで持たない**(exclusion)。後付けで散在実装すると input フォーカス時の誤発火等の事故が起きる
- 持つ場合の**登録機構(shortcut registry)は既に [0022](0022-capabilities-kernel.md) が `capabilities` カーネルの hook 例(keyboard shortcut registry・#25)として置き場を確定済み**。本 ADR はこれを再確認し、競合管理・input フォーカス時の抑制・表記(ヘルプ)は capabilities の registry seam が所有する(本 ADR で新たな家を作らない)
- キーボード操作性の a11y 目標は [0100](0100-accessibility-target.md)(WCAG 2.x AA)を正とする

### 6. ドラッグ&ドロップ = 非同梱 + WCAG 2.2 ドラッグ代替 seam(#27)

- **並べ替え / ファイルドロップの DnD ライブラリは本体に同梱しない**(0052 exclusion の延長)。native HTML Drag and Drop API を第一候補とする(§1)
- 採用する DnD は **WCAG 2.2 の Dragging Movements(SC 2.5.7)を満たす a11y 契約**を必須とする = **ドラッグ以外の単一ポインタ / キーボードによる代替操作を必ず提供する**。この「ドラッグ代替」を named seam として扱い、DnD を採る feature は代替経路の実装を伴う(a11y 契約なしの DnD は禁止。§禁止事項)
- DnD の挙動は UI 密着のため、focus-trap 同様に component co-location + feature 合成に置く([0022](0022-capabilities-kernel.md) の UI 挙動 hook 方針と同型)。a11y 目標は [0100](0100-accessibility-target.md)

### 7. 拡張点のコード実体化スコープ

本 ADR が敷く拡張点(sanitizer port / DnD ドラッグ代替 IF / §5 の registry は 0022 で確定済み)について、**「名前 + 家 + a11y 契約」を先に確定し、IF / ローカル機構の**コード実体化**は実装 PR に委ねる**。理由: これらは用途依存であり、動く最小実装(エディタ / DnD 機構)を本体へ同梱すると 0052 の非同梱決定と衝突するため、拡張点の形は「named seam + a11y 契約」に留め、materialize は最初の該当 feature 実装時に行う。

## 禁止事項

- ❌ 本 ADR が扱う interaction UI(リッチテキスト/エディタ・複雑入力 UI・DnD)ライブラリを **boilerplate 本体に同梱**すること(0052 exclusion の延長)
- ❌ native / built-in(native `<dialog>` / native input / native DnD API)で要件を満たせるのに、自前実装 / ライブラリで**再発明**すること(§1 built-in 優先を破る)
- ❌ 採用した interaction を **a11y 契約([0100](0100-accessibility-target.md))なしで実装**すること(modal の focus / scroll-lock / Escape、DnD の WCAG 2.2 ドラッグ代替、複雑入力のキーボード / ARIA)
- ❌ リッチテキスト表示で **sanitizer port を通さず** `dangerouslySetInnerHTML` を使うこと(規約の正は [0110](0110-security-operations.md))
- ❌ **route-as-modal(intercepting / parallel routes)の採否を本 ADR で確定**すること(ルーティング判断 = [0040](0040-routing-rendering-strategy.md) 管轄)
- ❌ shortcut registry を `capabilities` 以外に置くこと / focus-trap・scroll-lock・DnD 等の UI 密着挙動 hook を `capabilities` に上げること([0022](0022-capabilities-kernel.md):UI 挙動は component co-location)

## 補足

- **分類**([0140](0140-documentation-operations.md) タクソノミー): 本 ADR は exclusion(interaction UI 非同梱)+ a11y 拡張点(seam)を主とし、§4 の native `<dialog>` 既定という affirmative decision を内包する混成である。いずれも ADR に属する分類(decision / exclusion = ADR)であり、日常強制の粒度規約(rule)は 0110(XSS)/ 0100(a11y チェック)/ rules.md 側が持つ
- **0052 からの到達性(reachability)注記**: [0052](0052-ui-component-policy.md) は Accepted の Protected Documentation のため本 ADR 作成時点では編集せず、本 ADR が 0052 の射程を interaction 面へ具体化する形をとる。結果として 0052 本体から本 ADR への back-link が無く、0052 だけを読む読者が射程確定に到達できないリスクがある。**0052 → 本 ADR の相互参照付与は、AGENTS.md 整合と同じ整理フェーズでまとめて行う**(§関連 ADR / flag)
- **採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**(独立起票)
- **v2 採用予定(局所ライブラリ・2026-07-14)**: 本 exclusion 本体は不変。採用マトリクス([adoption-matrix.md](../plan/adoption-matrix.md))で interaction UI ライブラリは **v2 = 局所ライブラリ採用**(用途依存)に振り分けられた。**a11y 拡張点(seam)(sanitizer port / DnD ドラッグ代替 IF / registry seam)は敷済・ライブラリ採用は v2**(リッチテキスト = TipTap / DnD = dnd-kit・ともに Thin。§1 built-in 優先と §3〜6 の a11y 契約は不変)。採用時も本体は seam と a11y 契約を保持し、TipTap / dnd-kit を [0010](0010-standards-and-non-lockin.md)(vendor-independent 正当化 + adapters/カーネル境界の裏で差替可能・vendor 直参照を feature/component に散らさない)/ [0004](0004-library-management.md)(exact-pin / `pnpm audit`)の枠内で置く。

## 関連 ADR

- [0052-ui-component-policy.md](0052-ui-component-policy.md) — UI ライブラリ / form コンポーネント非同梱の exclusion(本 ADR はその射程を interaction UI へ具体化する親決定)
- [0100-accessibility-target.md](0100-accessibility-target.md) — WCAG 2.x AA / biome a11y / 手動チェック(全 interaction の a11y 契約の正)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — route-as-modal(intercepting / parallel routes)採否の管轄(本 ADR では確定しない)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — 標準準拠 + 非ロックイン(§1 built-in 優先の vendor-independent 正当化の土台)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — keyboard shortcut registry seam(#25)の置き場 / UI 挙動 hook は component co-location の方針
- [0110-security-operations.md](0110-security-operations.md) — XSS / sanitize 規約(`dangerouslySetInnerHTML` 禁止 + sanitizer 必須。sanitizer port の規約の正)
- [0050-styling-strategy.md](0050-styling-strategy.md) — Tailwind 主軸 + CSS Modules 限定許可(styled-components / emotion は非採用。採用 UI のスタイル手段)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — カーネル配置・命名規律・受入基準(sanitizer port / 表示 seam の物理配置の根拠)
- [0004-library-management.md](0004-library-management.md) — exact pin / audit(fork 先が interaction UI ライブラリを採る際の枠)
- [docs/plan/adr-gap-triage.md](../plan/adr-gap-triage.md) — interaction UI クラスタ(#15 / #16 / #22 / #25 / #27)の disposition

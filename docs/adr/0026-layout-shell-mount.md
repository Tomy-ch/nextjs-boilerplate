# layout の横断 UI / Provider mount(app シェル合成)

`<Toaster/>`・グローバル nav / footer・各 Provider(テーマ / capabilities / ポリシー)を **root layout に mount する経路が無かった**(構造ブロッカー **S4**。詳細は [structural-blocker-resolutions.md](../plan/structural-blocker-resolutions.md))。[0025](0025-app-layer-elements.md) の `app/route-segment` は import 先が `features` のみで、[0022](0022-capabilities-kernel.md) の Provider mount 例外は `capabilities` 限定に書かれていたため、横断 UI シェルと Provider を layout に置けなかった。

本 ADR は **layout の mount 例外を一般化**し、`layout` と `page` を区別してこれを解消する(新カーネル不要)。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。S4 の解決を S ごとに 1 主題 = 1 ADR として独立起票したもの([[user]] 2026-07-14)。内容自体はこの設計討議でユーザ確定済み。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きする）

## 背景

トーストの queue 状態と `<Toaster/>` UI は「UI 状態(業務状態でない)」なので `components` に置ける([0022](0022-capabilities-kernel.md) の「UI 密着は component」原則)。しかしその `<Toaster/>` やレイアウトシェル(nav / footer)・各 Provider を **root `layout.tsx` に mount する経路**が、`app → features のみ`のマトリクスと capabilities 限定の mount 例外の下では存在しなかった。

## 決定: layout の mount 例外を一般化 + layout / page を区別

`app/route-segment`([0025](0025-app-layer-elements.md))のうち **`layout.tsx`(特に root)** は、横断 UI シェルと Provider を **薄く mount** してよい:

- 横断 UI シェル(nav / footer / `<Toaster/>`)を **`components`** から
- Provider を `components` / `capabilities`([0022](0022-capabilities-kernel.md))/ ポリシー seam([0031](0031-policy-state-supply.md))から

制約 = **配置のみ**。`<ThemeProvider><Toaster/>{children}</ThemeProvider>` の**配置は薄い mount(可)**、layout で hook を呼びデータを組むのは**ロジック(不可 = feature の仕事)**。

- **`page.tsx` は `features` のみ**(不変)
- 根拠: root layout は「どの feature にも属さない **app シェル**(html / body・グローバル Provider・nav / footer / toaster)の合成点」であり、`page.tsx`(= 画面 = 1 feature)と性質が違う

### 横断 UI 状態の帰属(mount と対で確定)

- **トースト queue** → `components`(UI 状態・Provider + `useToast()`)。feature は `features → components`(既存許可)で `useToast().show()` を呼ぶ
- **テーマ** → `capabilities` / `components` の Provider

## 禁止事項

- ❌ `page.tsx` が横断 UI / Provider を直接 mount すること(mount 例外は `layout.tsx` 限定)
- ❌ `layout.tsx` で hook 呼び + データ配線を行うこと(mount = 配置のみ。合成は feature)
- ❌ トースト queue 等の UI 状態をグローバル状態ライブラリで持つこと([0060](0060-state-management.md))

## 補足

- **採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**(独立起票・S ごと 1 ADR)。
- **既存 ADR への内容反映は 2026-07-14 に適用済**(ユーザ承認のもと): [0021](0021-frontend-responsibility.md) 依存マトリクスの `app/route-segment` 行に layout mount 例外 / [0022](0022-capabilities-kernel.md) の mount 例外を本 ADR へ一般化する pointer。

## 関連 ADR

- [0025-app-layer-elements.md](0025-app-layer-elements.md) — `app/route-segment`(layout / page。本 ADR が layout の mount を細分)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — Provider mount 例外(本 ADR が capabilities 限定から一般化)
- [0031-policy-state-supply.md](0031-policy-state-supply.md) — ポリシー Provider(反応的供給時に layout mount)
- [0050-styling-strategy.md](0050-styling-strategy.md) — テーマ / ダークモード(Provider mount 対象)
- [0080-error-handling.md](0080-error-handling.md) / [0052-ui-component-policy.md](0052-ui-component-policy.md) — トースト UI(#19)の帰属先
- [docs/plan/structural-blocker-resolutions.md](../plan/structural-blocker-resolutions.md) — 構造ブロッカー S4 の由来・全体像

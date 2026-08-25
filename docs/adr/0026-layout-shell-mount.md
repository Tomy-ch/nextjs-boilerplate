# layout の横断 UI / Provider mount(app シェル合成)

`<Toaster/>`・グローバル nav / footer・各 Provider(テーマ / capabilities / ポリシー)を **root layout に mount する経路が無かった**(構造ブロッカー **S4**)。[0025](0025-app-layer-elements.md) の `app/route-segment` は import 先が `features` のみで、[0022](0022-capabilities-kernel.md) の Provider mount 例外は `capabilities` 限定に書かれていたため、横断 UI シェルと Provider を layout に置けなかった。

本 ADR は **layout の mount 例外を一般化**し、`layout` と `page` を区別してこれを解消する(新カーネル不要)。

## Status

Accepted

（**採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**。S4 の解決を S ごとに 1 主題 = 1 ADR として独立起票したもの(ユーザ決定 2026-07-14)。内容自体はこの設計討議でユーザ確定済み。日付 2026-07-14。0.0.x の ADR は living document として本文を直接上書きする）

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

### パンくずを置く画面(器ではなく画面が持つ)

パンくずは**器が全画面へ一律に置くものではない**。置くのは次の条件を満たす画面だけである。

- **global nav から 1 手で戻れない祖先を持つ**(= 階層が 2 段以上)

したがって根の画面、nav が直接指している画面、および**線形フロー**(入力 → 確認 → 完了のように段を順に進み、戻ることを想定しない流れ)には置かない。前 2 つは nav と同じ導線を二重に置くだけであり、線形フローでは「戻れる場所」を示すことが離脱の導線になる。段の進捗は `Stepper` が持つ。

- **到達経路が複数ある画面では、辿った経路ではなくサイト構造上の階層を示す**(一覧から入っても絞り込みから入っても、同じ `トップ > 一覧 > 1 件`)
- **置く主体は画面**である。器は口を持たない。どの階層を示すかは画面が持っている値(1 件の名前など)に依存し、器が知ると画面ごとの分岐を器が抱える

パンくずは WCAG の AA 要件ではない(SC 2.4.8 Location は AAA。[0100](0100-accessibility-target.md))。したがって上記は a11y 要件の充足ではなく、**情報構造を一貫させるための規約**である。

## 禁止事項

- ❌ `page.tsx` が横断 UI / Provider を直接 mount すること(mount 例外は `layout.tsx` 限定)
- ❌ `layout.tsx` で hook 呼び + データ配線を行うこと(mount = 配置のみ。合成は feature)
- ❌ 器(`AppShell`)がパンくずの口を持つこと、および階層が 1 段の画面へパンくずを置くこと
- ❌ 本来ローカルで足りる一時的な UI 状態(単発トーストの表示フラグ等)を、shell マウント層でグローバル状態として抱え込むこと。横断的に共有すべき UI 状態は [0060](0060-state-management.md) が採用した `stores`(Zustand)へ置く

## 補足

- **採番はブロック帯で確定(2026-07-14・0001〜0155(トピック順ブロック帯))**(独立起票・S ごと 1 ADR)。
- **既存 ADR への内容反映は 2026-07-14 に適用済**(ユーザ承認のもと): [0021](0021-frontend-responsibility.md) 依存マトリクスの `app/route-segment` 行に layout mount 例外 / [0022](0022-capabilities-kernel.md) の mount 例外を本 ADR へ一般化する pointer。

## 関連 ADR

- [0025-app-layer-elements.md](0025-app-layer-elements.md) — `app/route-segment`(layout / page。本 ADR が layout の mount を細分)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — Provider mount 例外(本 ADR が capabilities 限定から一般化)
- [0031-policy-state-supply.md](0031-policy-state-supply.md) — ポリシー Provider(反応的供給時に layout mount)
- [0050-styling-strategy.md](0050-styling-strategy.md) — テーマ / ダークモード(Provider mount 対象)
- [0080-error-handling.md](0080-error-handling.md) / [0052-ui-component-policy.md](0052-ui-component-policy.md) — トースト UI(#19)の帰属先

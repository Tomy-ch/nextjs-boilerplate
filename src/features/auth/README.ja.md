> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# auth

ログインの画面スライスです。持つのは「認証を始める」導線だけです。

## 受け入れるもの

- 認証を始める操作と、そこへ至った理由（未認証で弾かれた、ログアウト直後、始められずに戻された）の提示
- この画面ではアカウントを作らないことの説明。どの IdP を繋いでも真である範囲だけを書き、名前や環境ごとの案内は入れません
- 認証後に戻る先の受け渡し

## 受け入れないもの

- 認証そのもの（IdP との往復、トークンの交換、session の作成）。すべて `/api/auth/*` の
  Route Handler と `adapters/server/auth` が持ちます
- メールアドレスとパスワードの入力欄。**この構成では**資格情報を IdP の画面が受け取るため、この画面を通りません。[0079](../../../docs/adr/0079-auth-frontend-seam.ja.md) は**入力面を所有画面へ置く**ことを決めており、ここはその到達点にまだ居ません
- session の読み取り（画面は認証済みかどうかを知らない。判定は `verifySession()` と `proxy.ts`）

## Route と契約

| Route | 仕様書 | 認証 |
| --- | --- | --- |
| `/login` | [`screen`](../../../docs/spec/route/auth/login/page.screen.ja.md) / [`function`](../../../docs/spec/route/auth/login/page.function.ja.md) | 不要（ここがエントリポイント） |

外枠の約束は [`auth` の layout](../../../docs/spec/route/auth/layout.screen.ja.md) が持ちます。

**operationId は使いません。** この画面が呼ぶのは同一オリジンの `/api/auth/login` だけで、IdP と
やり取りするのは Route Handler です。どの IdP を繋いでも画面が変わらないのは、契約をここへ
持ち込んでいないためです。

## 状態とデザイン参照

| 画面 | 状態 | story |
| --- | --- | --- |
| ログイン | 直接来た | `Features/Auth/LoginView/Default` |
| | 保護ルートで弾かれた（戻り先つき） | `Features/Auth/LoginView/WithReturnUrl` |
| | 認証を始められなかった | `Features/Auth/LoginView/Unavailable` |

loading / empty / error の 3 つは持ちません。**取得が無いためです** —— 画面が出るのは case が
確定した後で、待つものも、空になるものもありません。

## 構成

画面が 1 つしかないため、画面を挟まず直下へ置きます。

| モジュール | 役割 |
| --- | --- |
| `login-view.tsx` | ログイン画面。認証を始める form と、始められなかったときの案内 |
| `read-login-notice.ts` | URL から案内する理由を読む（読む側） |
| `facade/paths.ts` | 他の feature が指すための、この画面への行き先 |
| `facade/login-notice.ts` | 案内の語彙と、始められなかったときの行き先（組む側）。**行き先を組むのは Route Handler**（`app/api/auth/login`）で、Route Handler が引けるのは feature の `facade/` だけ |

## 依存カーネル

| カーネル | 用途 |
| --- | --- |
| `model` | 戻り先の安全な形（`return-url`）と、案内する理由の語彙 |
| `components` | 面を組む器（カード・ボタン・案内） |
| `observability` | レンダリングを span に載せる |

**`adapters` を引きません。** 認証の往復を持たないためで、これがこの slice の線引きそのものです。

## Action 戻り値契約

なし。認証の開始は Server Action ではなく、`/api/auth/login` への素の form 送信です。**Server
Action の `redirect()` は Route Handler へ遷移できません** —— client router が飲み込み、リクエストが
出ないまま URL だけが書き換わります。

## テスト観点

- [ ] 戻り先が安全な形へ均されてから form に載る（外部の URL が素通りしない）
- [ ] 案内の理由ごとに文言が変わり、理由が無いときは何も出ない
- [ ] 資格情報の入力欄が画面に現れない

## 隣に置くもの

- 保護ルートの判定と未認証時のリダイレクトは [`src/proxy.ts`](../../proxy.ts)
- 認証の往復は [`src/app/api/auth/`](../../app/api/auth)
- 確定認可は [`adapters/server/auth`](../../adapters/server/auth)

## 関連する ADR

- [0021](../../../docs/adr/0021-frontend-responsibility.ja.md) — レイヤーの責務と import 境界。他 feature へ貸すものを `facade/` に出す
- [0025](../../../docs/adr/0025-app-layer-elements.ja.md) — app レイヤーの構成要素。Route Handler が引ける先は feature の `facade/` まで
- [0027](../../../docs/adr/0027-directory-structure.ja.md) — 物理配置と co-location。画面が 1 つなら画面ディレクトリを挟まない
- [0043](../../../docs/adr/0043-middleware-policy.ja.md) — エントリポイント（proxy）の役割。保護ルートの判定と未認証時の送り先はそちらが持つ
- [0079](../../../docs/adr/0079-auth-frontend-seam.ja.md) — 認証の前面のシーム。資格情報を持たず、IdP との往復を Route Handler へ渡す

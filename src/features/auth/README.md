---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging]
forbidden: [features] # 相手の facade/ と、画面まるごとの story は例外 (ADR 0021)
test-requirement: feature
---

# auth

ログインの画面スライスです。持つのは「認証を始める」導線だけです。

## 受け入れるもの

- 認証を始める操作と、そこへ至った理由（未認証で弾かれた、ログアウト直後）の提示
- 認証後に戻る先の受け渡し

## 受け入れないもの

- 認証そのもの（IdP との往復、トークンの交換、session の作成）。すべて `/api/auth/*` の
  Route Handler と `adapters/server/auth` が持ちます（[0079](../../../docs/adr/0079-auth-frontend-seam.md) §6）
- メールアドレスとパスワードの入力欄。資格情報は IdP の画面が受け取るもので、この画面を通りません
- session の読み取り（画面は認証済みかどうかを知らない。判定は `verifySession()` と `proxy.ts`）

## 構成

画面が 1 つしかないため、画面を挟まず直下へ置きます（[0027](../../../docs/adr/0027-directory-structure.md)）。

| モジュール | 役割 |
| --- | --- |
| `login-view.tsx` | ログイン画面。認証を始める form だけを持つ |

## 隣に置くもの

- 保護ルートの判定と未認証時のリダイレクトは [`src/proxy.ts`](../../proxy.ts)
- 認証の往復は [`src/app/api/auth/`](../../app/api/auth)
- 確定認可は [`adapters/server/auth`](../../adapters/server/auth)

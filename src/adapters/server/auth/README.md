---
imports-allowed: [model, errors, logging, config]
forbidden: [components, capabilities, stores, business-logic]
test-requirement: unit
---

# auth

認証の境界です。session の封緘と復元、IdP との往復、確定認可の入口を持ちます。

## 親と違う点

親（`src/adapters/`）は `integration` を宣言しています。あれは
[0090](../../../../docs/adr/0090-testing-strategy.md) の「HTTP 境界のみを対象とし、内側は mock、
型と形をアサートする」要求で、**外部通信を持つモジュールにだけ意味があります**。

この区画で外部通信を持つのは 2 つだけです。

| 外部通信を持つ（`integration`） | 持たない（`unit`） |
| --- | --- |
| `oidc-discovery.ts` / `default-session-resolver.ts` | `pkce.ts` / `random-token.ts` / `session-cookie.ts` / `session.ts` / `resolver.ts` / `optimistic-session.ts` / `test-session.ts` / `development-access.ts` |

宣言を `unit` にしているのは、多数派がそちらであるためです。上の 2 つは HTTP 境界を持つので
`integration` の要求も併せて満たします。判定は「そのモジュールが外へ出るか」で行い、
ディレクトリの位置では決めません。

## 受け入れるもの

- session の保管形式と、その封緘・復元
- IdP との往復（Discovery / 認可要求 / トークン交換 / ログアウト）
- 確定認可の入口（`verifySession()`）と、Bearer の取り出し口

## 受け入れないもの

- 保護ルートの判定・`returnUrl` の検証・役割による認可。方式が変わっても変わらないため、
  Resolver の外（`model` と `proxy.ts`）が持ちます（[0079](../../../../docs/adr/0079-auth-frontend-seam.md) §6）
- `SessionRecord` を外へ出すこと。Access Token を含むため、内側へ渡すのは `Session` だけです

## 差し替え点

`session-resolver.ts` の `SessionResolver` が唯一の差し替え単位です。fork 先が自社方式へ移るときは
`resolver.ts` が返す実装を替えます。cookie を扱う側は封緘された文字列しか触らないため、方式が
変わっても書き直しになりません。

## 隣に置くもの

- 認証の往復の口は [`src/app/api/auth/`](../../../app/api/auth)
- 入口の楽観判定は [`src/proxy.ts`](../../../proxy.ts)

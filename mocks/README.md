# 契約駆動モック

`make gen-api` が契約から生成する MSW ハンドラの置き場です。**手で編集しません。**
契約が変われば自動的にモックも変わる、という一方向を保つための場所であり、
手書きのモックを足すと契約とモックが別々に動き始めます。

`src/` の外に置くのは [0027](../docs/adr/0027-directory-structure.md) の規定によります。

## 構成

| パス | 中身 |
| --- | --- |
| `api/endpoints.msw.ts` | 本体 API の MSW ハンドラ。response は faker で組み立てられる |
| `api/endpoints.ts` / `auth/endpoints.ts` | orval が生成する HTTP client。**使いません**(下記) |

## 使わない client がここにある理由

orval は client の出力先(`target`)を必須とします。一方 outbound の resilience は `adapters/server` の
手書き wrapper が所有する([0071](../docs/adr/0071-bff-api-integration.md))ため、生成された client を
本番が使うことはありません。これを `src/adapters/gen/` へ置くと「どちらで呼ぶのか」が生成物の側から
曖昧になるため、mock 生成の副産物としてこちらに寄せています。MSW ハンドラはこの client に依存しません。

## 認証のモック

mock OIDC Provider(`auth` 契約)のハンドラは生成していません。認証の配線は別途行うため、
使う当てのないハンドラを先に置かない方針です。

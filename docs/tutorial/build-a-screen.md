# Tutorial: Build One Screen End to End

This is a step-by-step guide to **building one screen in this repository end to end, from the contract through display, submission, tests and the catalog**.
The rules are held by [`rules.md`](../rules.md), the decisions by [`adr/`](../adr/), and how to decide placement by
[`design/placement.md`](../design/placement.md). This document does not copy them; **it assembles one feature
climbing the layers in dependency order, and at the end of each step shows with a check command what now passes**.

## Who This Document Is For

- Someone who created a repository from the template and starts writing the first screen **after deleting the bundled sample**
- Someone who has read through the per-layer READMEs but wants to see "what to actually write in which file" as one path
- Someone who wants to become **able to judge whether** what `pnpm gen` or the `new-feature` skill produced is correct

**This document is meant to be read precisely after the sample is deleted.** The bundled sample is a set of implementation examples, but a repository
created from the template purges it first. What remains after the purge is the rules, the ADRs and the per-layer READMEs, and the only thing
that shows "so how do I write it" is this document. That is why this document **does not reference the code that disappears**.

## What We Build

We build a feature `notes` that handles your own "notes". The subject is the first thing a repository created from the template replaces,
so it is deliberately ordinary.

| Route | Screen | Authentication |
| --- | --- | --- |
| `/notes` | List. Lines up titles and updated times, newest first | Required |
| `/notes/[id]` | Detail. Read the body and go on to editing | Required |
| `/notes/[id]/edit` | Editing one note. Save the title and body | Required |

All three screens sit behind authentication. **The difference between an endpoint that names an actor and one that does not** is covered in Step 3, which also shows
what changes if you want to build a public list.

The layers we pass through, and what we write in each.

| Step | Layer | What is written |
| --- | --- | --- |
| 0 | — | Delete the sample and check the tree that remains |
| 1 | `openapi/` → `src/adapters/gen/` | Import the contract and generate wire types, zod and mocks |
| 2 | `src/model/note/` | Display types, identifier brands, display validation |
| 3 | `src/adapters/server/api/` | Fetch and update endpoints. Classification and credentials |
| 4 | `src/features/notes/` | Composing the list and the detail (`page-content` / `view` / `ui/`) |
| 5 | `src/app/notes/` | Route segment, metadata, layout shell, protection declaration |
| 6 | `src/features/notes/` + `src/app/notes/` | Submitting the edit (Server Action) and how the result is shown |
| 7 | Next to each layer | Tests. What is checked where |
| 8 | `*.stories.tsx` / `e2e/lib/screens.ts` | Catalog and baseline images |
| 9 | `docs/spec/route/notes/` / `src/features/notes/README.md` | The screen's promises and the slice's index |

## Dependency Order

Dependencies point inward, but **assembly starts from the contract**. Without the generated artifacts the fetch endpoints cannot be written, and without the fetch endpoints
the screens cannot be assembled.

```text
contract (openapi/)
  └─ generation (src/adapters/gen/ + mocks/)
       └─ model  →  adapters/server  →  features  →  app
                                            └─ submission (actions.ts) → tests → catalog / baseline images → specification
```

**The order of work when building a screen is a separate thing.** [`playbook.md`](../playbook.md#order-of-work-when-building-a-screen) "Order of Work When Building a Screen" goes
direction → story → review → separation → specification → tests, writing tests once the appearance is settled. This document is ordered by dependency
so that a check can pass at the end of each step; it does not replace
the order of work. When actually building a screen, write Step 4's `view` and Step 8's story
first, get them through review, and fill in the rest after that.

Each Step has **a purpose, the files it touches, real code, where to go at confusing branches, and check commands**.

## Prerequisites

- The toolchain is installed (`make install-tools` / `pnpm install`)
- The development server and the catalog start with `APP_ENV=local`. For `pnpm dev` / `pnpm storybook`,
  `package.json` adds it
- To proceed without a backend, use `APP_API_MODE=mock`. A mock generated from the contract responds
  ([`mocks/README.md`](../../mocks/README.md)). Where environment variables go is
  [`env/README.md`](../../env/README.md)
- Opening a screen behind authentication needs a session. In development, `/dev/session` issues one without going through the IdP
  ([`src/features/dev-session/README.md`](../../src/features/dev-session/README.md))
- Work on a working branch so you can start over

```bash
git switch -c tutorial/build-a-screen
```

---

## Step 0 — Reset to Zero

**Purpose:** delete the bundled sample and see what remains. This is the starting point.

What gets deleted is declared by `scripts/setup/remove-sample/sample-manifest.ts`. The purge tool itself is
included in the targets and deletes itself after running. Reading it first shows where the line between what remains and what disappears runs.

```bash
# 何が消えるかを表示するだけ。書き換えない
DRY_RUN=1 make setup-remove-sample

# 実行。破棄のあと整形・検査・build・test・残留検証まで連鎖する
make setup-remove-sample
```

**What remains** (this document may reference only these):

| Location | What remains |
| --- | --- |
| `src/app/` | The root layout, `(auth)`, `api/auth` / `api/health` / `api/telemetry`, `dev/session`, `maintenance`, `not-found`, and a minimal `page.tsx` for checking that things work |
| `src/features/` | `auth` / `dev-session` / `maintenance` and the layer README |
| `src/model/` | Types and functions with no subject, such as `action-state` / `pagination` / `datetime` / `search-params` / `session` / `authz` |
| `src/adapters/` | `server/http` (the fetch wrapper and the per-classification connection points `getPublicClient()` / `getUserScopedClient()`) / `server/auth` / `client/http` / `http/`. **`server/api/` and `gen/` become empty** |
| `src/components/` | All of it. Only components without the subject's vocabulary are placed here |
| `mocks/` | The mechanism (`stable-responses.ts` / `node.ts` / `serve.ts`). **`api/` becomes empty** |
| `docs/` | ADRs, design explanations, rules, layer READMEs, and the specifications of the screens that remain in the core |

**What disappears:** the subject's screens (the route groups and segments under `src/app/` that the subject owns), the `features` / `model` /
`adapters/server/api` / `stores` specific to them, the contract (`openapi/api.gen.yaml`) and the generated artifacts, the subject's specifications,
and the subject's E2E journeys.

**Check:** the purge chain finishes green to the end. Also look at the tree.

```bash
git status --short
ls src/features src/adapters/server
```

At this point `src/adapters/server/api/` does not exist. The following Steps rebuild it.

---

## Step 1 — Import the Contract and Generate

**Purpose:** import the backend's OpenAPI contract and generate wire types, zod schemas and MSW handlers.
**Do not edit the generated artifacts** — this is the line between "what you write" and "what you must not write".

**The contract this document assumes.** The authoritative copy lives in the backend's repository; this only shows the shape.
Substitute your own contract.

```yaml
paths:
  /v1/notes:
    get:
      operationId: GetNotes
      tags: [notes]
      security: [{ bearerAuth: [] }]
      parameters:
        - { name: first, in: query, schema: { type: integer, minimum: 1, maximum: 50, default: 20 } }
        - { name: after, in: query, schema: { type: string, maxLength: 512 } }
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/NoteListResponse" }
  /v1/notes/{noteId}:
    parameters:
      - { name: noteId, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      operationId: GetNotesDetail
      tags: [notes]
      security: [{ bearerAuth: [] }]
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/NoteDetailResponse" }
        "404": { $ref: "#/components/responses/NotFound" }
    patch:
      operationId: PatchNotesDetail
      tags: [notes]
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/NotePatchRequest" }
      responses:
        "200":
          content:
            application/json:
              schema: { $ref: "#/components/schemas/NoteDetailResponse" }
        "404": { $ref: "#/components/responses/NotFound" }
        "409": { $ref: "#/components/responses/Conflict" }
components:
  schemas:
    NoteSummary:
      type: object
      required: [id, title, updatedAt]
      properties:
        id: { type: string, format: uuid }
        title: { type: string, maxLength: 100 }
        updatedAt: { type: string, format: date-time }
    NoteListResponse:
      type: object
      required: [items, nextCursor]
      properties:
        items: { type: array, items: { $ref: "#/components/schemas/NoteSummary" } }
        nextCursor: { type: string, nullable: true }
    NoteDetailResponse:
      allOf:
        - { $ref: "#/components/schemas/NoteSummary" }
        - type: object
          required: [body]
          properties:
            body: { type: string, maxLength: 2000 }
    NotePatchRequest:
      type: object
      required: [title, body]
      properties:
        title: { type: string, maxLength: 100 }
        body: { type: string, maxLength: 2000 }
```

**Declare the fetch coordinates.** Add one entry to `sources` in `openapi/sources.yaml`. Keeping `name` as `api` is
the default, and the generation side (`orval.config.ts` / `scripts/openapi/gen-api-plan.ts`) holds that spelling
(the reason is in [`openapi/README.md#multiple-contracts`](../../openapi/README.md#multiple-contracts)).

```yaml
sources:
  - name: api
    repo: <owner>/<backend-repo>
    path: openapi/openapi.gen.yaml
    ref: <commit-sha>
```

Pin `ref` to a commit SHA. `sha` / `fetchedAt` are written back at fetch time, so do not write them.

```bash
make api-fetch      # sources.yaml の座標から取得し、openapi/api.gen.yaml へ置く
make api-gen        # 型 / zod / MSW ハンドラを生成する
```

**What appears (generated artifacts; do not edit):**

| Path | Contents |
| --- | --- |
| `src/adapters/gen/api/model/` | Wire types. Correspond to `components.schemas`, such as `NoteSummary` / `NotePatchRequest` |
| `src/adapters/gen/api/endpoints.zod.ts` | zod per operation. `GetNotesResponse` / `GetNotesDetailResponse` / `PatchNotesDetailResponse` / `GetNotesQueryParams` |
| `src/adapters/gen/api/limits.ts` | Only constants that involve no validation. This is the only thing the client may import |
| `mocks/api/endpoints.msw.ts` | Contract-driven MSW handlers |

**zod names are determined by the operationId.** The table above gives the spellings derived from the assumed contract; check the actual spellings by opening the generated
`endpoints.zod.ts`. The code from here on uses these spellings.

**What you write outside the generated artifacts when you add a contract.** Restore the wiring that the sample purge emptied. Each is one
to a few lines, and the reason for each location is held by its README.

| File | What to write | Where the reason is |
| --- | --- | --- |
| `mocks/handlers.ts` | One line passing the generated artifact to `stableHandlers` | [`mocks/README.md`](../../mocks/README.md) |
| `GENERATED_MODULES` in `scripts/lib/untested-modules.ts` | `src/adapters/gen/**` and `mocks/api/**` | Do not impose tests on code nobody writes (the doc in the same file) |
| The frontmatter `coverage-exclusions` of `src/adapters/README.md` / `mocks/README.md` | The same two patterns | `scripts/coverage-exclusion.gate.test.ts` requires a record in the owning README |
| `PATTERNED_MOCK_PROPERTIES` / `operations` in `orval.config.ts` | Fields that have a `pattern`, and values determined as a pair | The comments in the same file |

**If in doubt:** when you want to fix a generated artifact, fix the contract and regenerate
([0072](../adr/0072-api-type-generation.md)). How the contract is imported and how to read the generated artifacts is in
[`design/data-fetching.md#from-contract-to-generated-artifacts-from-generated-artifacts-to-display-types`](../design/data-fetching.md#from-contract-to-generated-artifacts-from-generated-artifacts-to-display-types).

**Check:**

```bash
make api-gen-check                 # 契約と生成物の版が揃っている
ls src/adapters/gen/api mocks/api  # 生成物が出ている
```

---

## Step 2 — `model`: Display Types and Parsing at the Boundary

**Purpose:** define the types the screens pass around, separately from the contract's types. **Generated types do not come here**. What this holds is
the shape for display, identifier brands, and display validation.

**Files:**

- `src/model/note/note.ts` — display types and the function that settles an identifier
- `src/model/note/note-schema.ts` — display validation for the edit form

```ts
// src/model/note/note.ts
import * as z from "zod/mini";

import type { CursorPage } from "../pagination";

/** メモの識別子を確定させるスキーマ。生成スキーマの中で組み合わせる呼び出しだけがこれを直接使う。 */
export const noteIdSchema = z.string().brand<"note">();

/**
 * メモを指す識別子。
 *
 * @remarks
 * 素の `string` を代入できない形にしてあります。識別子はどれも UUID の文字列で、取り違えても
 * 型では止まらないためです。
 */
export type NoteId = z.infer<typeof noteIdSchema>;

/**
 * 文字列をメモの識別子として確定させる。
 *
 * @remarks
 * **呼んでよいのは境界だけ**です。外から来た値を確定させる場所（`adapters` の検証の出口・
 * フォームの受け取り・route の動的セグメント）で 1 度だけ通し、内側では確定した型を持ち回ります。
 * 実在するかは検査しません。存在しない値は取得が `not-found` として返します。
 */
export function toNoteId(value: string): NoteId {
  return noteIdSchema.parse(value);
}

/** 一覧に並ぶメモ 1 件。本文は含まない。 */
export type NoteSummary = {
  readonly id: NoteId;
  readonly title: string;
  readonly updatedAt: Date;
};

/** cursor 方式で取得した一覧の 1 ページ。 */
export type NotePage = CursorPage<NoteSummary>;

/** メモ 1 件の全体。 */
export type Note = NoteSummary & {
  readonly body: string;
};
```

```ts
// src/model/note/note-schema.ts
import * as z from "zod/mini";

/**
 * メモ入力の表示検証。
 *
 * @remarks
 * 手書きなのは、これが**表示のための規則**であって wire contract ではないためです。生成スキーマを
 * 入力検証へ持ち込むと、契約の型が `model` と feature へ漏れます。契約側の検証は `adapters` の
 * 境界が生成スキーマで別に行います。
 *
 * 上限は契約の更新要求側に合わせます。文言は項目名を主語にして書きます。
 */
export const noteSchema = z.object({
  title: z
    .string()
    .check(
      z.minLength(1, "題名を入力してください。"),
      z.maxLength(100, "題名は 100 文字以内で入力してください。"),
    ),
  body: z.string().check(z.maxLength(2000, "本文は 2000 文字以内で入力してください。")),
});

/** {@link noteSchema} を通した入力。 */
export type NoteInput = z.infer<typeof noteSchema>;

/** 入力欄として現れる項目名。項目エラーのキーになる。 */
export type NoteField = keyof NoteInput;

/**
 * 空欄を受け付けない項目かを返す。
 *
 * @remarks
 * 必須かどうかを列挙せず、スキーマへ空文字を通して判定します。列挙すると、規則を緩めたのに
 * 画面が必須のままという状態を作れます。
 */
export function isRequiredNoteField(field: NoteField): boolean {
  return !noteSchema.shape[field].safeParse("").success;
}
```

Points to note.

- **Hold dates and times as `Date`.** The contract carries ISO strings, but strings are not let into the inner layers. Mapping to `Date` is done by
  Step 3's endpoint
- **Brand identifiers.** Only the boundary may call `toNoteId`. The inside passes `NoteId` around
  ([0029](../adr/0029-type-design-discipline.md))
- **Use `zod/mini`.** Display validation is also shipped to the browser, so importing classic `zod` bloats the bundle
  ([`design/forms.md#the-two-tiers-of-validation-and-which-one-is-authoritative`](../design/forms.md#the-two-tiers-of-validation-and-which-one-is-authoritative))

**If in doubt:** what may go in `model` is in [`src/model/README.md`](../../src/model/README.md#what-belongs-here)
"What Belongs Here / What Does Not Belong Here". Business rules (what the backend decides) do not come here
([0070](../adr/0070-backend-role-separation.md)).

**Check:** put the tests next to the files, then run them (how to write tests is Step 7).

```bash
pnpm exec vitest run src/model/note
```

---

## Step 3 — `adapters/server`: Fetch and Update Endpoints

**Purpose:** build the endpoints that take the contract's shape and return `model` types. The fetch wrapper (deadline, retries, circuit breaking,
response validation, status classification) is held by `adapters/server/http/request.ts`, so what is written here is
**only the endpoint's classification, conversion and path assembly**.

**File:** `src/adapters/server/api/notes.ts`

```ts
// src/adapters/server/api/notes.ts
import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { type Note, type NoteId, type NotePage, type NoteSummary, toNoteId } from "@/model/note/note";

import {
  GetNotesDetailResponse,
  GetNotesResponse,
  PatchNotesDetailResponse,
} from "../../gen/api/endpoints.zod";
import type { NotePatchRequest } from "../../gen/api/model";
import { getUserScopedClient } from "../http/user-scoped-client";

const NOTES_PATH = "/v1/notes";

/** 一覧が 1 度に引く件数。契約の既定値に頼らず、画面の側で決める。 */
export const NOTE_PAGE_SIZE = 20;

type WireNoteSummary = z.infer<typeof GetNotesResponse>["items"][number];
type WireNote = z.infer<typeof GetNotesDetailResponse>;

function toNoteSummary(wire: WireNoteSummary): NoteSummary {
  return {
    id: toNoteId(wire.id),
    title: wire.title,
    updatedAt: new Date(wire.updatedAt),
  };
}

function toNote(wire: WireNote): Note {
  return { ...toNoteSummary(wire), body: wire.body };
}

/**
 * 自分のメモを 1 ページ取得する。
 *
 * @remarks
 * 更新日時の降順で返ります。次ページの鍵は応答の `nextCursor` に載ります。
 *
 * @param after - 前のページが返した cursor。先頭なら省略
 */
export const getMyNotes = cache(async (after?: string): Promise<NotePage> => {
  const wire = await getUserScopedClient().request({
    path: NOTES_PATH,
    searchParams: { first: String(NOTE_PAGE_SIZE), after },
    schema: GetNotesResponse,
  });

  return { items: wire.items.map(toNoteSummary), nextCursor: wire.nextCursor };
});

/**
 * 自分のメモを 1 件取得する。
 *
 * @remarks
 * 他人のメモも存在しないメモも、区別なく `not-found` になります。契約が存在を秘匿するためで、
 * 呼び出し側が所有者を確かめる必要はありません。
 */
export const getMyNote = cache(async (id: NoteId): Promise<Note> => {
  const wire = await getUserScopedClient().request({
    path: `${NOTES_PATH}/${encodeURIComponent(id)}`,
    schema: GetNotesDetailResponse,
  });

  return toNote(wire);
});

/**
 * メモの題名と本文を保存する。
 *
 * @remarks
 * 送るのは絶対値（設定）なので、再送しても結果は変わりません。冪等キーは要りません。
 * 他の場所で先に更新されていた場合は `conflict` として返ります。
 */
export async function updateMyNote(id: NoteId, input: NotePatchRequest): Promise<Note> {
  const wire = await getUserScopedClient().request({
    path: `${NOTES_PATH}/${encodeURIComponent(id)}`,
    method: "PATCH",
    body: { title: input.title, body: input.body } satisfies NotePatchRequest,
    schema: PatchNotesDetailResponse,
  });

  return toNote(wire);
}
```

Points to note.

- **Do not build a client; obtain the connection point that matches the classification.** An endpoint that names an actor obtains `getUserScopedClient()`.
  Only connection points pass a credential fetch endpoint, and calling `createHttpClient` directly is failed by
  `project-rules/no-client-outside-connection-port`
- **`scope` is determined by the nature of the endpoint.** An endpoint that may carry credentials is
  `"user-scoped"`, including the times it did not carry them. This classification takes effect through types, and `cache` / `tags` cannot be passed
  ([0112](../adr/0112-data-classification-cache-boundary.md))
- **Wrap every endpoint in `cache()`.** Even when `generateMetadata` and the screen call the same endpoint within the same render, it collapses
  into one round trip. Writes, however, are not wrapped
- **Wire types do not leave here.** `toNoteSummary` / `toNote` map to `model` types, and types obtained with `z.infer` are used
  only inside this file ([0020](../adr/0020-adopted-architecture.md): generated and external types do not leak into inner layers)
- **Wrap the variable parts of a path in `encodeURIComponent`.** `..` survives encoding, but the wrapper
  rejects it with `invalid-argument` before assembly

**Branch: when you want a list that does not name an actor.** For a list anyone can read, the endpoint becomes `"public"` and
obtains `getPublicClient()` from `server/http/public-client.ts`.
Only that endpoint may declare `use cache` / `cacheLife` / `cacheTag`. How to write it, and why the endpoint side owns the lifetime, are in
[`src/adapters/README.md`](../../src/adapters/README.md#use-cache-is-what-persists-across-requests) "`use cache` is what persists across requests"
and [0071](../adr/0071-bff-api-integration.md). The `allowAnonymous` set on a request that can be read without logging in (the contract declares that operation's authentication
optional) is in the same README, 「資格情報を載せるかは接続口が、
送ってよいかは要求が決める」.

**Branch: when you want to fetch the second and later pages from the browser.** The first page is fetched by a Server Component calling this endpoint directly, and
only the rest is fetched through `app/api/notes/route.ts` (BFF) and `adapters/client/api/notes.ts`. The route and the division
of what each holds are in [`design/data-fetching.md`](../design/data-fetching.md#fetching-the-next-page-of-a-list) "Fetching the next page of a list", and the decision is
[0073](../adr/0073-pagination-fetch-boundary.md). This document proceeds with the first page only.

**Check:** the endpoint has an HTTP boundary, so it is verified as `integration` with MSW (Step 7). Some boundary rules exist only in ESLint,
so run it on the narrowed target.

```bash
pnpm exec vitest run src/adapters/server/api/notes.test.ts
pnpm exec eslint src/adapters/server/api/notes.ts
```

---

## Step 4 — `features/notes`: Composing the List and the Detail

**Purpose:** orchestrate the fetching and assemble the screens. Separating **`page-content.tsx`, which holds the fetching**, from **`view.tsx`, which can render
from props alone**, is this layer's shape, and `view` can bring out every state from a story without fetching.

**Files:**

```text
src/features/notes/
├── README.md                       # written in Step 9 (template: docs/templates/feature-readme.md)
├── paths.ts                        # the three paths this feature owns
├── load-note.ts                    # fetching one item and handling not-found; shared by detail and edit
├── note.fixture.ts                 # fixed values read by stories and tests
├── list/
│   ├── page-content.tsx            # fetching the first page
│   ├── view.tsx                    # the list screen; also owns the empty state
│   └── ui/
│       ├── note-list/note-list.tsx # the list
│       ├── empty/empty.tsx         # when there is not a single item
│       └── skeleton/skeleton.tsx   # loading UI
└── detail/
    ├── page-content.tsx
    └── view.tsx
```

**There are only two axes for nesting directories** — the first axis is the screen (`list` / `detail`), the second is the nature (`ui/`). Things that belong to no
screen (`paths.ts` / `load-note.ts`) go directly under the feature without a screen in between
([0027](../adr/0027-directory-structure.md): related files are co-located next to the implementation).

```ts
// src/features/notes/paths.ts
/** 一覧の経路。保護の宣言（`model/authz`）と同じ綴りを名乗る。 */
export const NOTE_LIST_PATH = "/notes";

/** 1 件の詳細の経路。 */
export function noteDetailPath(id: string): string {
  return `${NOTE_LIST_PATH}/${encodeURIComponent(id)}`;
}

/** 1 件の編集の経路。 */
export function noteEditPath(id: string): string {
  return `${noteDetailPath(id)}/edit`;
}
```

```ts
// src/features/notes/load-note.ts
import { notFound } from "next/navigation";

import { getMyNote } from "@/adapters/server/api/notes";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { type Note, toNoteId } from "@/model/note/note";

/**
 * route が受け取った識別子でメモを引き、`not-found` だけを Next の境界へ渡す。
 *
 * @remarks
 * try の範囲は取得だけです。それ以外の失敗は分類のまま投げ直し、route の `error` 境界が受けます。
 */
export async function loadNote(id: string): Promise<Note> {
  try {
    return await getMyNote(toNoteId(id));
  } catch (error) {
    if (findAppError(error)?.kind === ErrorKind.NOT_FOUND) {
      notFound();
    }

    throw error;
  }
}
```

```tsx
// src/features/notes/list/page-content.tsx
import { getMyNotes } from "@/adapters/server/api/notes";
import { withScreenSpan } from "@/observability/render-span";

import { NoteListView } from "./view";

/** 一覧の取得と組み立て。先頭ページだけを引く。 */
export const NoteListPageContent = withScreenSpan("features/notes/list/page-content", async () => {
  const page = await getMyNotes();

  return <NoteListView notes={page.items} />;
});
```

```tsx
// src/features/notes/list/view.tsx
import type { NoteSummary } from "@/model/note/note";
import { withScreenSpan } from "@/observability/render-span";

import { NoteListEmpty } from "./ui/empty/empty";
import { NoteList } from "./ui/note-list/note-list";

/** `NoteListView` の props。 */
export type NoteListViewProps = {
  /** 並べるメモ。空なら空の表示になる。 */
  notes: readonly NoteSummary[];
};

/**
 * 一覧の画面。取得を持たないので、空も含めて全状態を story から出せる。
 */
export const NoteListView = withScreenSpan(
  "features/notes/list/view",
  ({ notes }: NoteListViewProps) => {
    return notes.length === 0 ? <NoteListEmpty /> : <NoteList notes={notes} />;
  },
);
```

```tsx
// src/features/notes/list/ui/note-list/note-list.tsx
import Link from "next/link";

import { formatDateTime } from "@/model/datetime";
import type { NoteSummary } from "@/model/note/note";
import { withPartSpan } from "@/observability/render-span";

import { noteDetailPath } from "../../../paths";

/** `NoteList` の props。 */
export type NoteListProps = {
  /** 並べるメモ。1 件以上ある。 */
  notes: readonly NoteSummary[];
};

/** メモの並び。行そのものが詳細への行き先になる。 */
export const NoteList = withPartSpan(
  "features/notes/list/ui/note-list/note-list",
  ({ notes }: NoteListProps) => {
    return (
      <ul className="divide-y rounded-lg border">
        {notes.map((note) => (
          <li key={note.id}>
            <Link
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-4 hover:bg-muted"
              href={noteDetailPath(note.id)}
            >
              <span className="font-emphasis">{note.title}</span>
              <time className="text-sm text-muted-foreground" dateTime={note.updatedAt.toISOString()}>
                {formatDateTime(note.updatedAt)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    );
  },
);
```

```tsx
// src/features/notes/list/ui/empty/empty.tsx
import { withPartSpan } from "@/observability/render-span";

/** 並べるものが無いときの表示。 */
export const NoteListEmpty = withPartSpan("features/notes/list/ui/empty/empty", () => {
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <p className="text-muted-foreground">メモがまだありません。</p>
    </div>
  );
});
```

```tsx
// src/features/notes/list/ui/skeleton/skeleton.tsx
import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";
import { withPartSpan } from "@/observability/render-span";

/** 枠だけで見せる行数。1 画面に収まる範囲に留める。 */
const PLACEHOLDER_ROWS = 5;

const ROWS = Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => index);

/** 一覧の待機表示。実際に並ぶ行と同じ高さ・同じ区切りで枠だけを出す。 */
export const NoteListSkeleton = withPartSpan("features/notes/list/ui/skeleton/skeleton", () => {
  return (
    <ul aria-hidden="true" className="divide-y rounded-lg border">
      {ROWS.map((row) => (
        <li className="flex items-center justify-between gap-4 px-4 py-4" key={row}>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-28" />
        </li>
      ))}
    </ul>
  );
});
```

```tsx
// src/features/notes/detail/page-content.tsx
import { withScreenSpan } from "@/observability/render-span";

import { loadNote } from "../load-note";
import { NoteDetailView } from "./view";

/** `NoteDetailPageContent` の props。 */
export type NoteDetailPageContentProps = {
  /** route が受け取った識別子。 */
  id: string;
};

/** 詳細の取得と組み立て。 */
export const NoteDetailPageContent = withScreenSpan(
  "features/notes/detail/page-content",
  async ({ id }: NoteDetailPageContentProps) => {
    const note = await loadNote(id);

    return <NoteDetailView note={note} />;
  },
);
```

```tsx
// src/features/notes/detail/view.tsx
import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/design-system/navigation/breadcrumb/breadcrumb";
import { formatDateTime } from "@/model/datetime";
import type { Note } from "@/model/note/note";
import { withScreenSpan } from "@/observability/render-span";

import { NOTE_LIST_PATH, noteEditPath } from "../paths";

/** `NoteDetailView` の props。 */
export type NoteDetailViewProps = {
  /** 表示するメモ。 */
  note: Note;
};

/** メモ 1 件の詳細。見出しはパンくずの現在地が担う。 */
export const NoteDetailView = withScreenSpan(
  "features/notes/detail/view",
  ({ note }: NoteDetailViewProps) => {
    return (
      <article className="flex flex-col gap-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={NOTE_LIST_PATH}>メモ</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{note.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-2xl font-emphasis">{note.title}</h1>
        <p className="text-sm text-muted-foreground">
          最終更新 <time dateTime={note.updatedAt.toISOString()}>{formatDateTime(note.updatedAt)}</time>
        </p>
        <p className="whitespace-pre-wrap">{note.body}</p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href={noteEditPath(note.id)}>編集する</Link>
          </Button>
          <Button asChild variant={BUTTON_VARIANT.OUTLINE}>
            <Link href={NOTE_LIST_PATH}>一覧へ戻る</Link>
          </Button>
        </div>
      </article>
    );
  },
);
```

Points to note.

- **The top of a screen uses `withScreenSpan`; components in `ui/` use `withPartSpan`.** The name matches the module path
  from `src/` ([`src/features/README.md`](../../src/features/README.md#putting-rendering-on-spans) "Putting rendering on spans")
- **`view` holds no fetching.** Giving it fetching makes it impossible to render in a story. For `loading`, the route's
  `Suspense` shows the `skeleton`, and `error` is received by the route's `error.tsx`, so the states `view` holds are
  success and empty
- **Write font weight with a semantic class such as `font-emphasis`.** A raw value such as `font-bold` is failed by ESLint
  ([0051](../adr/0051-styling-system.md))
- **When something other features use appears, move it out to `facade/`.** There is none now, so do not create one. Do not lift things early
  because they "might be used" ([`design/placement.md`](../design/placement.md) 「「使いそう」で上げると戻らない」)

**If in doubt:** whether to put a component in `ui/` or lift it to `components` is the branch in
[`design/placement.md#display-ui`](../design/placement.md#display-ui). What applies first is "does it carry the subject's
vocabulary", and anything that does cannot go to `components`.

**Check:**

```bash
pnpm exec vitest run src/features/notes
pnpm check:architecture            # 層の境界（import の向き）が README の宣言と一致している
```

---

## Step 5 — `app/notes`: Route Segment and Metadata, Layout Shell, Protection

**Purpose:** bind the URL to the screen, declare the metadata, set up the layout shell, and declare that it is behind authentication.
`page.tsx` only calls the feature thinly and holds no judgment.

**Files:**

```text
src/app/notes/
├── layout.tsx              # layout shell: header / nav / main / footer
├── require-session.ts      # authoritative authorization; sends actors who cannot enter to login
├── page.tsx                # /notes
└── [id]/
    ├── page.tsx            # /notes/[id]
    ├── not-found.tsx       # the not-found surface
    ├── error.tsx           # the failure surface
    └── edit/
        └── page.tsx        # /notes/[id]/edit (Step 6)
```

**Declare the protection.** Add one line to `ROUTE_POLICIES` in `src/model/authz.ts`. The entry point (`src/proxy.ts`)'s
pre-screening and `robots.txt` are taken from this declaration.

```ts
const ROUTE_POLICIES: readonly RoutePolicy[] = [
  { prefix: "/account", allowed: AUTHENTICATED_ROLES },
  { prefix: "/admin", allowed: ADMIN_ROLES },
  { prefix: "/notes", allowed: AUTHENTICATED_ROLES },
];
```

**Pre-screening is not a line of defense.** The definitive authorization is passed inside the screen. Only `app` and
`adapters` can import `adapters/server/auth` (`RESTRICTED_AREAS` in `architecture.ts`), so the check goes not in the feature but in a module
on the `app` side.

```ts
// src/app/notes/require-session.ts
import { redirect } from "next/navigation";

import { verifySession } from "@/adapters/server/auth/session";
import { loginPath } from "@/features/auth/facade/paths";

/**
 * 認証済みの主体であることを、画面を描く前に確かめる。
 *
 * @remarks
 * 各画面が同じ判定を書き写すと、条件が 1 箇所ずつずれていきます。判定そのものは `adapters` が持ち、
 * ここが持つのは入れなかった主体をどこへ送るかだけです。
 *
 * @param returnTo - 認証を終えた利用者を戻す先
 */
export async function requireSession(returnTo: string): Promise<void> {
  if ((await verifySession()) === null) {
    redirect(loginPath(returnTo));
  }
}
```

```tsx
// src/app/notes/layout.tsx
import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { NOTE_LIST_PATH } from "@/features/notes/paths";

import { SITE_NAME } from "../site";

const NAV_ITEMS = [{ href: NOTE_LIST_PATH, label: "メモ" }];

/**
 * メモの画面の外枠。
 *
 * @remarks
 * root layout は `html` / `body` と Provider の mount だけを持つので、header と nav はここで据えます。
 * 同じ器を別の segment も使うようになったら、route group に昇格させます。
 *
 * この器自身は何も取得しません。主体を知らないと決まらない導線は `navSlot` へ `Suspense` で渡します。
 */
export default function NotesLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell navItems={NAV_ITEMS} siteName={SITE_NAME}>
      {children}
    </AppShell>
  );
}
```

```tsx
// src/app/notes/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { NoteListPageContent } from "@/features/notes/list/page-content";
import { NoteListSkeleton } from "@/features/notes/list/ui/skeleton/skeleton";
import { NOTE_LIST_PATH } from "@/features/notes/paths";

import { requireSession } from "./require-session";

export const metadata: Metadata = {
  title: "メモ",
  description: "自分のメモの一覧です。",
  robots: { index: false, follow: false },
};

/**
 * 一覧の中身。
 *
 * @remarks
 * **取得と判定を解くのはここです。** 器の側で待つと、待っている間は殻すら配れません。
 */
async function NoteListContent() {
  await requireSession(NOTE_LIST_PATH);

  return <NoteListPageContent />;
}

/** メモの一覧。 */
export default function NotesPage() {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>メモ</PageHeaderTitle>
          <PageHeaderDescription>更新の新しい順に並んでいます。</PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<NoteListSkeleton />}>
        <NoteListContent />
      </Suspense>
    </ContentContainer>
  );
}
```

```tsx
// src/app/notes/[id]/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import { NoteDetailPageContent } from "@/features/notes/detail/page-content";
import { NoteListSkeleton } from "@/features/notes/list/ui/skeleton/skeleton";
import { noteDetailPath } from "@/features/notes/paths";

import { requireSession } from "../require-session";

export const metadata: Metadata = {
  title: "メモの詳細",
  robots: { index: false, follow: false },
};

/**
 * 詳細の中身。
 *
 * @remarks
 * **存在しないメモでも 200 が返ります。** 殻を先に流すため、`notFound()` に達した時点で応答の
 * ヘッダは出ています。見つからないことは画面（`not-found.tsx`）と `noindex` が伝えます。
 */
async function NoteDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireSession(noteDetailPath(id));

  return <NoteDetailPageContent id={id} />;
}

/** メモの詳細。見出しは feature 側の `view` が持つ。 */
export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ContentContainer className="py-8">
      <Suspense fallback={<NoteListSkeleton />}>
        <NoteDetailContent params={params} />
      </Suspense>
    </ContentContainer>
  );
}
```

```tsx
// src/app/notes/[id]/not-found.tsx
import Link from "next/link";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import { NOTE_LIST_PATH } from "@/features/notes/paths";

/** 見つからない面。文言は分類ごとに `errors` が持つので、ここで組み立てない。 */
export default function NoteDetailNotFound() {
  return (
    <ContentContainer className="flex flex-col items-start gap-4 py-8">
      <h1 className="text-xl font-emphasis">{getDefaultErrorMeta(ErrorKind.NOT_FOUND).message}</h1>
      <Link className="underline" href={NOTE_LIST_PATH}>
        一覧へ戻る
      </Link>
    </ContentContainer>
  );
}
```

```tsx
// src/app/notes/[id]/error.tsx
"use client";

import { Button } from "@/components/design-system/action/button/button";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";

/**
 * 失敗の面。
 *
 * @remarks
 * 文言はここで組み立てません。production では Server Component から投げられたエラーの本文が
 * 伏せられ、境界には `digest` しか渡らないためです。
 */
export default function NoteDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ContentContainer className="flex flex-col items-start gap-4 py-8">
      <h1 className="text-xl font-emphasis">{getDefaultErrorMeta(ErrorKind.INTERNAL).message}</h1>
      {error.digest === undefined ? null : (
        <p className="text-sm text-muted-foreground">リクエスト ID: {error.digest}</p>
      )}
      <Button onClick={reset} type="button">
        もう一度読み込む
      </Button>
    </ContentContainer>
  );
}
```

Points to note.

- **Resolve `params` / `searchParams` inside the dynamic hole.** Awaiting them in the layout shell makes it impossible to deliver the static shell
  ([0041](../adr/0041-cache-components-decision.md)). Do not declare the rendering mode with segment config such as `dynamic`.
  Only a screen that cannot deliver a static shell declares `export const instant = false`, with a reason
- **A screen that requires authentication sets `robots: { index: false, follow: false }`.** It is hidden even in environments that allow indexing.
  For a screen anyone can open, set `alternates.canonical` instead and list it in `PUBLIC_PATHS` of `src/app/sitemap.ts`
  ([`src/app/README.md`](../../src/app/README.md#metadata-base-and-per-route-differences) "Metadata Base and Per-Route Differences")
- **To output a content-dependent `title` on a dynamic-segment screen, use `generateMetadata`.** Put the decision in a module on the feature side,
  and have the page only resolve `params` and pass them on. Step 3's `cache()` collapses the fetch into
  one ([0044](../adr/0044-seo-metadata-strategy.md))
- **Only `layout.tsx` may mount cross-cutting UI and Providers** ([0026](../adr/0026-layout-shell-mount.md))

**If in doubt:** whether a static shell can be delivered, where to put the waiting boundary, and how to separate the failure and absence surfaces are per-screen judgments,
and where to write the answers is the table in [`src/app/README.md`](../../src/app/README.md#decisions-this-layer-owns) "Decisions This Layer Owns".

**Check:** actually open it on the development server. Issue a session with `/dev/session`.

```bash
APP_API_MODE=mock pnpm dev
# 別の端末で
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/notes
# → 307 http://localhost:3000/login?returnUrl=%2Fnotes（未認証は入口で送り返される）
```

Open `http://localhost:3000/dev/session` in the browser, issue a `user` session, and open `/notes` →
the detail → a nonexistent ID (`/notes/00000000-0000-7000-8000-000000000000`) in that order. The mock responds to any ID,
so the not-found surface is verified by the tests in Step 7.

Reconciling the build output against the rendering declarations is run after the build.

```bash
APP_API_MODE=mock pnpm build && pnpm render-mode
```

---

## Step 6 — Submission: Server Action and How the Result Is Shown

**Purpose:** build the edit screen and get the round trip `<form action>` → Server Action → `ActionState` → screen working.
**The Server Action holds only orchestration, and moves parsing and classification out next to it**.

**Files (added to the tree from Step 4):**

```text
src/features/notes/
├── actions.ts                      # the Server Action that saves
├── form-names.ts                   # FormData field names; sender and reader use the same spelling
├── form-state.ts                   # the return type, and wording only this screen can say
├── parse-note-form.ts              # parses FormData; re-runs display validation
├── __mocks__/actions.ts            # the replacement used in the catalog
└── edit/
    ├── page-content.tsx
    ├── view.tsx
    └── ui/note-form/note-form.tsx  # client island
src/app/notes/[id]/edit/page.tsx
```

```ts
// src/features/notes/form-names.ts
import type { NoteField } from "@/model/note/note-schema";

/** 入力欄の `name`。項目の集合とスキーマの項目を `satisfies` で突き合わせる。 */
export const NOTE_FIELD_NAMES = {
  title: "title",
  body: "body",
} as const satisfies Readonly<Record<NoteField, string>>;

/** 対象を指す hidden の `name`。 */
export const NOTE_ID_FIELD = "noteId";
```

```ts
// src/features/notes/form-state.ts
import type { ActionState } from "@/model/action-state";
import type { NoteField } from "@/model/note/note-schema";

/**
 * 保存の結果。
 *
 * @remarks
 * 成功値を持ちません。保存後の内容は画面が取り直すので、結果に載せて運ぶものがありません
 * （`ActionState` は `useActionState` の境界を越えて直列化されるため、`Date` を持つ `Note` は
 * 載せられません）。
 */
export type NoteFormState = ActionState<undefined, NoteField>;

/** 対象が送られてこなかったときの文言。 */
export const TARGET_LOST_MESSAGE = "対象のメモが判りません。画面を開き直してください。";

/** 入力が表示検証を通らなかったときの、フォーム全体の文言。項目ごとの文言はスキーマが持つ。 */
export const INVALID_INPUT_MESSAGE = "入力内容を確認してください。";

/**
 * 他の場所で先に更新されていたときの文言。
 *
 * @remarks
 * カタログの既定文言は分類だけを伝えるもので、拒まれた理由を言えるのはこの画面だけです。
 */
export const CONFLICT_MESSAGE = "他の場所で先に更新されています。読み込み直してから、もう一度保存してください。";
```

```ts
// src/features/notes/parse-note-form.ts
import { z } from "zod";

import type { FieldErrors } from "@/model/action-state";
import { type NoteField, type NoteInput, noteSchema } from "@/model/note/note-schema";

import { NOTE_FIELD_NAMES } from "./form-names";

/** {@link parseNoteForm} の結果。 */
export type NoteFormParseResult =
  | { readonly ok: true; readonly input: NoteInput }
  | { readonly ok: false; readonly fieldErrors: FieldErrors<NoteField> };

/** `FormData` の 1 項目を文字列として読む。未入力と欠落を同じ空文字へ均す。 */
function readField(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

/**
 * 送信された `FormData` を、保存に渡せる形へ解く。
 *
 * @remarks
 * 検証は client と同じスキーマで通し直します。client の検証は即時に返すためのもので、そこを
 * 通ったことは何の保証にもなりません。
 */
export function parseNoteForm(formData: FormData): NoteFormParseResult {
  const parsed = noteSchema.safeParse({
    title: readField(formData, NOTE_FIELD_NAMES.title),
    body: readField(formData, NOTE_FIELD_NAMES.body),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  return { ok: true, input: parsed.data };
}
```

```ts
// src/features/notes/actions.ts
"use server";

import { revalidatePath } from "next/cache";

import { updateMyNote } from "@/adapters/server/api/notes";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import {
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";
import { toNoteId } from "@/model/note/note";

import { NOTE_ID_FIELD } from "./form-names";
import {
  CONFLICT_MESSAGE,
  INVALID_INPUT_MESSAGE,
  type NoteFormState,
  TARGET_LOST_MESSAGE,
} from "./form-state";
import { parseNoteForm } from "./parse-note-form";
import { NOTE_LIST_PATH, noteDetailPath } from "./paths";

/** 送信から対象のメモを取り出す。載っていなければ null。 */
function readNoteId(formData: FormData): string | null {
  const id = formData.get(NOTE_ID_FIELD);

  return typeof id === "string" && id !== "" ? id : null;
}

/**
 * メモを保存する。
 *
 * @remarks
 * 主体を断言しません。契約が本人のメモだけを対象とし、他人のメモは存在ごと秘匿するため、この
 * 操作で他人のメモへ届く経路がありません。
 *
 * **成立したら詳細と一覧を取り直させます。** 画面に留まる保存なので、進んだあとの内容は同じ画面が
 * 出し直し、題名は一覧にも出ます。
 *
 * `409` にだけ専用の文言と `kind` を当てます。画面は `kind` で読み込み直す導線を出し分けます。
 */
export async function updateNoteAction(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const id = readNoteId(formData);

  if (id === null) {
    return failedActionState({ formError: TARGET_LOST_MESSAGE });
  }

  const parsed = parseNoteForm(formData);

  if (!parsed.ok) {
    return failedActionState({ formError: INVALID_INPUT_MESSAGE, fieldErrors: parsed.fieldErrors });
  }

  try {
    await updateMyNote(toNoteId(id), parsed.input);
  } catch (error) {
    if (findAppError(error)?.kind === ErrorKind.CONFLICT) {
      return failedActionState({ formError: CONFLICT_MESSAGE, kind: ErrorKind.CONFLICT });
    }

    return actionStateFromError(error);
  }

  revalidatePath(noteDetailPath(id));
  revalidatePath(NOTE_LIST_PATH);

  return succeededActionState(undefined);
}
```

```tsx
// src/features/notes/edit/page-content.tsx
import { withScreenSpan } from "@/observability/render-span";

import { loadNote } from "../load-note";
import { NoteEditView } from "./view";

/** `NoteEditPageContent` の props。 */
export type NoteEditPageContentProps = {
  /** route が受け取った識別子。 */
  id: string;
};

/** 編集の取得と組み立て。詳細と同じ口で引くので、同じ描画の中では 1 往復にまとまる。 */
export const NoteEditPageContent = withScreenSpan(
  "features/notes/edit/page-content",
  async ({ id }: NoteEditPageContentProps) => {
    const note = await loadNote(id);

    return <NoteEditView note={note} />;
  },
);
```

```tsx
// src/features/notes/edit/view.tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/design-system/navigation/breadcrumb/breadcrumb";
import type { Note } from "@/model/note/note";
import { withScreenSpan } from "@/observability/render-span";

import { NOTE_LIST_PATH, noteDetailPath } from "../paths";
import { NoteForm } from "./ui/note-form/note-form";

/** `NoteEditView` の props。 */
export type NoteEditViewProps = {
  /** 編集するメモ。入力欄の初期値になる。 */
  note: Note;
};

/** 編集の画面。パンくずと form を組む。 */
export const NoteEditView = withScreenSpan(
  "features/notes/edit/view",
  ({ note }: NoteEditViewProps) => {
    return (
      <div className="flex flex-col gap-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={NOTE_LIST_PATH}>メモ</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={noteDetailPath(note.id)}>{note.title}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>編集</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <NoteForm note={note} />
      </div>
    );
  },
);
```

```tsx
// src/features/notes/edit/ui/note-form/note-form.tsx
"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import { Input } from "@/components/design-system/form/input/input";
import { Textarea } from "@/components/design-system/form/textarea/textarea";
import { FormField } from "@/components/patterns/form-field/form-field";
import { useToast } from "@/components/shell/toaster/toaster";
import { ErrorKind } from "@/errors/error-kind";
import { idleActionState } from "@/model/action-state";
import type { Note } from "@/model/note/note";
import { isRequiredNoteField } from "@/model/note/note-schema";

import { updateNoteAction } from "../../../actions";
import { NOTE_FIELD_NAMES, NOTE_ID_FIELD } from "../../../form-names";
import type { NoteFormState } from "../../../form-state";
import { noteEditPath } from "../../../paths";

/** `NoteForm` の props。 */
export type NoteFormProps = {
  /** 編集するメモ。 */
  note: Note;
};

/**
 * 送信ボタン。
 *
 * @remarks
 * `useFormStatus` は `form` の子でしか送信状態を読めないため、別の部品に切り出しています。
 */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button pending={pending} pendingLabel="保存しています…" type="submit">
      保存する
    </Button>
  );
}

/**
 * メモの編集フォーム。
 *
 * @remarks
 * 値は画面が持ちます（制御欄）。`<form action>` は action が終わると失敗でも `form.reset()` を呼ぶので、
 * 非制御の欄では弾かれた送信のあとに書いた内容が失われます。
 *
 * 成功は toast で伝えます。画面を移さない保存なので、この場に留まる通知が合います。
 */
export function NoteForm({ note }: NoteFormProps) {
  const [state, formAction] = useActionState<NoteFormState, FormData>(
    updateNoteAction,
    idleActionState(),
  );
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const id = useId();
  const { toast } = useToast();

  useEffect(() => {
    if (state.status === "success") {
      toast({ title: "メモを保存しました" });
    }
  }, [state, toast]);

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      {state.status === "error" && state.formError !== null ? (
        <FormFeedback description={state.formError} title="保存できませんでした" variant="destructive">
          {state.kind === ErrorKind.CONFLICT ? (
            <Button asChild size="sm" variant={BUTTON_VARIANT.OUTLINE}>
              <Link href={noteEditPath(note.id)}>読み込み直す</Link>
            </Button>
          ) : null}
        </FormFeedback>
      ) : null}
      <input name={NOTE_ID_FIELD} type="hidden" value={note.id} />
      <FormField
        controlId={`${id}-title`}
        label="題名"
        message={fieldErrors?.title?.[0]}
        required={isRequiredNoteField("title")}
      >
        {(control) => (
          <Input
            {...control}
            name={NOTE_FIELD_NAMES.title}
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        )}
      </FormField>
      <FormField
        controlId={`${id}-body`}
        label="本文"
        message={fieldErrors?.body?.[0]}
        required={isRequiredNoteField("body")}
      >
        {(control) => (
          <Textarea
            {...control}
            name={NOTE_FIELD_NAMES.body}
            onChange={(event) => setBody(event.target.value)}
            rows={8}
            value={body}
          />
        )}
      </FormField>
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
```

```ts
// src/features/notes/__mocks__/actions.ts
import { fn } from "storybook/test";

import { succeededActionState } from "@/model/action-state";

import type { NoteFormState } from "../form-state";

/**
 * カタログでの `updateNoteAction`。
 *
 * @remarks
 * 本物は成立すると画面を取り直しますが、カタログには取り直す先が無いので、成功を返してその場に
 * 留まります。
 */
export const updateNoteAction = fn(
  async (): Promise<NoteFormState> => succeededActionState(undefined),
).mockName("updateNoteAction");
```

Add one line declaring the replacement to `.storybook/preview.tsx`. Without it, pressing the button in the catalog fails while loading
`config`.

```ts
sb.mock(import("../src/features/notes/actions.ts"));
```

Exclude `__mocks__/` from the coverage denominator. Add `src/features/notes/__mocks__/**` to `CATALOG_MOCK_MODULES` in `scripts/lib/untested-modules.ts`,
and write the same pattern into the frontmatter `coverage-exclusions` of `src/features/notes/README.md`
as well (Step 9).

```tsx
// src/app/notes/[id]/edit/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { NoteEditPageContent } from "@/features/notes/edit/page-content";
import { NoteListSkeleton } from "@/features/notes/list/ui/skeleton/skeleton";
import { noteEditPath } from "@/features/notes/paths";

import { requireSession } from "../../require-session";

export const metadata: Metadata = {
  title: "メモの編集",
  robots: { index: false, follow: false },
};

async function NoteEditContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireSession(noteEditPath(id));

  return <NoteEditPageContent id={id} />;
}

/**
 * メモの編集。
 *
 * @remarks
 * 詳細とは独立した route です。1 つの画面に表示と編集を同居させると、どちらの状態で開いているかが
 * URL から失われ、戻る操作も共有もできなくなります。
 */
export default function NoteEditPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>メモの編集</PageHeaderTitle>
          <PageHeaderDescription>題名と本文を変更できます。</PageHeaderDescription>
        </div>
      </PageHeader>
      <Suspense fallback={<NoteListSkeleton />}>
        <NoteEditContent params={params} />
      </Suspense>
    </ContentContainer>
  );
}
```

Points to note.

- **Validation happens three times.** Before sending (the browser; omitted in this document), inside the Server Action
  (`parseNoteForm` runs the same schema again; this one is authoritative), and the contract validation in `adapters` (the generated schema).
  Their roles differ, so none can be omitted ([0062](../adr/0062-form-input-validation.md))
- **Return failures as return values.** Only `redirect()` throws, and that is the signal of success. Put `revalidatePath` and
  `redirect()` **outside** the `try` ([`design/forms.md`](../design/forms.md#common-pitfalls) "Common Pitfalls")
- **The signal for switching what is shown is `kind`, not the text.** The reload path is decided by `state.kind === ErrorKind.CONFLICT`.
  If the text is the signal, the path silently disappears the moment the text is fixed
- **A Server Action is a public HTTP endpoint.** Even if the screen is protected, the action is not. This action
  can avoid asserting the actor because the contract only covers the user's own notes; **an action that needs to assert the actor
  goes in `app/**/actions.ts`** (`features` cannot reach `adapters/server/auth`;
  [0025](../adr/0025-app-layer-elements.md))

**If in doubt:** who holds the input values (only buttons and hidden fields / react-hook-form / `useState`), and
whether to show the result inline, as a toast or as a redirect, are branches held by [`design/forms.md`](../design/forms.md),
and the decisions are [0061](../adr/0061-form-mutation-ux.md) /
[0063](../adr/0063-mutation-result-notification.md). The criterion for inserting a confirmation dialog is
[docs/rules.md](../rules.md#forms).

**Check:**

```bash
pnpm exec vitest run src/features/notes/actions.test.ts src/features/notes/parse-note-form.test.ts
```

Open `/notes/<id>/edit` on the development server, empty the title and save. Check that `題名を入力してください。` appears below the field
and that the field's content does not disappear.

---

## Step 7 — Tests: What Is Checked Where

**Purpose:** check only the responsibilities each layer carries, next to that layer. **Do not check the same thing in two layers.**

What is checked where is decided by the per-layer responsibility table in [0090](../adr/0090-testing-strategy.md), and the frontmatter `test-requirement` of each directory's
README declares which row applies. The tests written for this feature are
as follows.

| Subject | Responsibility | What it checks | What it does not check |
| --- | --- | --- | --- |
| `model/note/*.test.ts` | `unit` | Attaching the brand, the required check, the display validation messages | The contract's shape |
| `adapters/server/api/notes.test.ts` | `integration` | The HTTP boundary stopped by MSW. URL, headers, body, conversion, classification | The screen |
| `features/notes/load-note.test.ts` | `unit` | That only `not-found` goes to `notFound()`, and everything else is rethrown | HTTP |
| `features/notes/**/*.test.tsx` | `feature` | Rendered output and a11y. `page-content` is `render(await Component(props))` | HTTP (the adapter is `vi.mock`ed) |
| `features/notes/actions.test.ts` | `unit` | The classification of the returned `ActionState`, revalidation on success | HTTP |
| `app/notes/require-session.test.ts` | `unit` | Unauthenticated goes to login, authenticated passes through | Restoring the session |

**Map `export` to `describe` 1:1.** `scripts/one-to-one.gate.test.ts` requires a `describe` with the same name for every `export`.
`page.tsx` is out of scope (declared in `scripts/lib/untested-modules.ts`).

```ts
// src/adapters/server/api/notes.test.ts
import { describe, expect, it, vi } from "vitest";

import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { toNoteId } from "@/model/note/note";
import { serveJson, serveStatus, serveWrite } from "../../../../vitest.setup.msw";

const { getAccessToken, getEnvironment } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async (): Promise<string | null> => "access-token"),
  getEnvironment: vi.fn(() => PARSED_ENVIRONMENT),
}));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("../auth/session", () => ({ getAccessToken }));

import { getMyNote, getMyNotes, updateMyNote } from "./notes";

const NOTES_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/notes`;
const NOTE_URL = `${NOTES_URL}/:noteId`;

const wireNote = {
  id: "0195f0c2-0000-7000-8000-000000000001",
  title: "打ち合わせの覚え書き",
  body: "次回までに確かめること。",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

/** 投げられたエラーに付いた分類を返す。投げなければ undefined。 */
async function kindOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

describe("getMyNotes", () => {
  // ----- 正常系 -----
  it("契約の 1 件を表示用の 3 項目へ写す", async () => {
    serveJson(NOTES_URL, { items: [wireNote], nextCursor: null });

    const page = await getMyNotes();

    expect(page.items[0]).toEqual({
      id: wireNote.id,
      title: wireNote.title,
      updatedAt: new Date(wireNote.updatedAt),
    });
  });

  it("件数をクエリへ載せ、認証ヘッダを付けて送る", async () => {
    const requests = serveJson(NOTES_URL, { items: [], nextCursor: null });

    await getMyNotes();

    expect(requests[0]?.url).toBe(`${NOTES_URL}?first=20`);
    expect(requests[0]?.headers.get("Authorization")).toBe("Bearer access-token");
  });

  it("次ページのカーソルを引き継ぐ", async () => {
    serveJson(NOTES_URL, { items: [wireNote], nextCursor: "next" });

    await expect(getMyNotes()).resolves.toMatchObject({ nextCursor: "next" });
  });

  // ----- 異常系 -----
  it("認証できないとき取得へ出さず未認証として投げる", async () => {
    const requests = serveJson(NOTES_URL, { items: [], nextCursor: null });
    getAccessToken.mockResolvedValueOnce(null);

    await expect(kindOf(() => getMyNotes())).resolves.toBe(ErrorKind.UNAUTHENTICATED);
    expect(requests).toHaveLength(0);
  });
});

describe("getMyNote", () => {
  // ----- 正常系 -----
  it("本文まで含めて表示用の型へ写す", async () => {
    serveJson(NOTE_URL, wireNote);

    await expect(getMyNote(toNoteId(wireNote.id))).resolves.toMatchObject({
      body: wireNote.body,
      updatedAt: new Date(wireNote.updatedAt),
    });
  });

  // ----- 異常系 -----
  it("404 を not-found の分類で投げる", async () => {
    serveStatus("get", NOTE_URL, 404);

    await expect(kindOf(() => getMyNote(toNoteId(wireNote.id)))).resolves.toBe(
      ErrorKind.NOT_FOUND,
    );
  });
});

describe("updateMyNote", () => {
  // ----- 正常系 -----
  it("題名と本文を PATCH の本文で送る", async () => {
    const requests = serveWrite("patch", NOTE_URL, wireNote);

    await updateMyNote(toNoteId(wireNote.id), { title: "題名", body: "本文" });

    await expect(requests[0]?.json()).resolves.toEqual({ title: "題名", body: "本文" });
  });

  // ----- 異常系 -----
  it("409 を conflict の分類で投げる", async () => {
    serveStatus("patch", NOTE_URL, 409);

    await expect(
      kindOf(() => updateMyNote(toNoteId(wireNote.id), { title: "題名", body: "本文" })),
    ).resolves.toBe(ErrorKind.CONFLICT);
  });
});
```

```ts
// src/features/notes/load-note.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError, findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { getMyNote, notFound } = vi.hoisted(() => ({
  getMyNote: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/adapters/server/api/notes", () => ({ getMyNote }));
vi.mock("next/navigation", () => ({ notFound }));

import { NOTE } from "./note.fixture";
import { loadNote } from "./load-note";

beforeEach(() => {
  vi.clearAllMocks();
  getMyNote.mockResolvedValue(NOTE);
});

describe("loadNote", () => {
  // ----- 正常系 -----
  it("受け取った識別子でメモを引く", async () => {
    await expect(loadNote(NOTE.id)).resolves.toBe(NOTE);
    expect(getMyNote).toHaveBeenCalledWith(NOTE.id);
  });

  // ----- 異常系 -----
  it("見つからないメモは not-found の境界へ渡す", async () => {
    getMyNote.mockRejectedValue(createAppError(ErrorKind.NOT_FOUND));

    await expect(loadNote("無い")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("見つからない以外の失敗は分類のまま投げ直す", async () => {
    getMyNote.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    await expect(loadNote(NOTE.id)).rejects.toSatisfy(
      (error: unknown) => findAppError(error)?.kind === ErrorKind.UNAVAILABLE,
    );
    expect(notFound).not.toHaveBeenCalled();
  });
});
```

```ts
// src/features/notes/actions.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAppError } from "@/errors/app-error";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import { idleActionState } from "@/model/action-state";

const { updateMyNote, revalidatePath } = vi.hoisted(() => ({
  updateMyNote: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/adapters/server/api/notes", () => ({ updateMyNote }));

import { updateNoteAction } from "./actions";
import { CONFLICT_MESSAGE, INVALID_INPUT_MESSAGE, TARGET_LOST_MESSAGE } from "./form-state";

const NOTE_ID = "0195f0c2-0000-7000-8000-000000000001";

/** 形の上で通る最小の入力。 */
function noteForm(fields: Record<string, string> = {}): FormData {
  const form = new FormData();

  for (const [name, value] of Object.entries({ noteId: NOTE_ID, title: "題名", body: "本文", ...fields })) {
    if (value !== "") form.append(name, value);
  }

  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateNoteAction", () => {
  // ----- 正常系 -----
  it("解いた題名と本文で保存する", async () => {
    await updateNoteAction(idleActionState(), noteForm());

    expect(updateMyNote).toHaveBeenCalledWith(NOTE_ID, { title: "題名", body: "本文" });
  });

  it("成立したら、詳細と一覧を取り直させる", async () => {
    const state = await updateNoteAction(idleActionState(), noteForm());

    expect(state.status).toBe("success");
    expect(revalidatePath).toHaveBeenCalledWith(`/notes/${NOTE_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/notes");
  });

  // ----- 異常系 -----
  it("対象が送られてこなければ、保存を試みない", async () => {
    const state = await updateNoteAction(idleActionState(), noteForm({ noteId: "" }));

    expect(state).toMatchObject({ status: "error", formError: TARGET_LOST_MESSAGE });
    expect(updateMyNote).not.toHaveBeenCalled();
  });

  it("題名が空なら、項目の文言を付けて返し、保存を試みない", async () => {
    const state = await updateNoteAction(idleActionState(), noteForm({ title: "" }));

    expect(state).toMatchObject({
      status: "error",
      formError: INVALID_INPUT_MESSAGE,
      fieldErrors: { title: ["題名を入力してください。"] },
    });
    expect(updateMyNote).not.toHaveBeenCalled();
  });

  it("先に更新されていたことを、専用の文言と分類で伝える", async () => {
    updateMyNote.mockRejectedValueOnce(createAppError(ErrorKind.CONFLICT));

    const state = await updateNoteAction(idleActionState(), noteForm());

    expect(state).toMatchObject({
      status: "error",
      formError: CONFLICT_MESSAGE,
      kind: ErrorKind.CONFLICT,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("それ以外の失敗は分類ごとの既定の文言で伝える", async () => {
    updateMyNote.mockRejectedValueOnce(createAppError(ErrorKind.UNAVAILABLE));

    const state = await updateNoteAction(idleActionState(), noteForm());

    expect(state).toMatchObject({
      status: "error",
      kind: ErrorKind.UNAVAILABLE,
      formError: getDefaultErrorMeta(ErrorKind.UNAVAILABLE).message,
    });
  });
});
```

```tsx
// src/features/notes/list/ui/note-list/note-list.test.tsx
// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { NOTES } from "../../../note.fixture";
import { NoteList } from "./note-list";

describe("NoteList", () => {
  it("行そのものを詳細への行き先にする", () => {
    render(<NoteList notes={NOTES} />);

    expect(screen.getByRole("link", { name: new RegExp(NOTES[0].title) })).toHaveAttribute(
      "href",
      `/notes/${NOTES[0].id}`,
    );
  });

  it("受け取った件数だけ行を出す", () => {
    render(<NoteList notes={NOTES} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(NOTES.length);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<NoteList notes={NOTES} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
```

Points to note.

- **The outermost `describe` is the exported symbol's name**, and `it` describes the behavior in Japanese. Subjects that return values are
  split with `// ----- 正常系 -----` / `// ----- 異常系 -----`; subjects that return rendering are not split
- **Stop HTTP with MSW.** Do not substitute a hand-written `fetch` stub or a module mock of an adapter. Only files that import
  `vitest.setup.msw.ts` start MSW
- **Render an async RSC with `render(await Component(props))`.** Do not stack mocks that imitate the server runtime
  ([0091](../adr/0091-test-verification-methods.md))
- **Coverage is gated at 100% on all four metrics**, so coverage says nothing about "whether it means anything".
  Check the result specific to each branch ([`testing-conventions.md`](../testing-conventions.md#meaning-coverage--coverage-carries-no-information) "Meaning coverage — coverage carries no information")

**If in doubt:** assertion strength, the Testing Library principles, and how to handle APIs jsdom lacks are in
[`testing-conventions.md`](../testing-conventions.md).

**Check:** run only the files you wrote. The hooks and CI run the whole-repository gates, so do not get ahead of them.

```bash
pnpm exec vitest run src/model/note src/adapters/server/api/notes.test.ts src/features/notes src/app/notes
pnpm exec vitest run --config vitest.scripts.config.ts scripts/one-to-one.gate.test.ts scripts/test-requirement.gate.test.ts
```

---

## Step 8 — Catalog and Baseline Images

**Purpose:** pin the appearance of screens and components as stories, and protect it with baseline images. **Every component in `ui/` has its own
story**.

**A story's `title`:** a screen composition is `Page/<feature>/<screen>`, and a screen-specific component is
`Features/<feature>/<screen>/<component>`. The scheme is held by [`src/components/README.md`](../../src/components/README.md).

```ts
// src/features/notes/note.fixture.ts
import { toNoteId } from "@/model/note/note";
import type { Note, NoteSummary } from "@/model/note/note";

/** story とテストが読む固定のメモ。 */
export const NOTE: Note = {
  id: toNoteId("0195f0c2-0000-7000-8000-000000000001"),
  title: "打ち合わせの覚え書き",
  body: "次回までに確かめること。\n\n- 前提の整理\n- 担当の確認",
  updatedAt: new Date("2026-09-01T09:30:00+09:00"),
};

/** 一覧に並べる固定のメモ。長い題名と短い題名を混ぜ、折り返しの挙動が出るようにする。 */
export const NOTES: readonly NoteSummary[] = [
  NOTE,
  {
    id: toNoteId("0195f0c2-0000-7000-8000-000000000002"),
    title: "区切りの無い長い題名をひとつ置いて折り返しの見え方をこの行で確かめるためのメモ",
    updatedAt: new Date("2026-08-28T18:00:00+09:00"),
  },
  {
    id: toNoteId("0195f0c2-0000-7000-8000-000000000003"),
    title: "短い",
    updatedAt: new Date("2026-08-01T00:00:00+09:00"),
  },
];
```

```tsx
// src/features/notes/list/view.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { NOTES } from "../note.fixture";
import { NoteListView } from "./view";

const meta = {
  title: "Page/Notes/List",
  component: NoteListView,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "メモの一覧です。題名と更新日時を並べ、行そのものが詳細への行き先になります。",
      },
    },
  },
} satisfies Meta<typeof NoteListView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {
  args: { notes: NOTES },
};

/** 1 件も無い。 */
export const Empty: Story = {
  args: { notes: [] },
};
```

```tsx
// src/features/notes/edit/ui/note-form/note-form.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ToastProvider } from "@/components/shell/toaster/toaster";

import { NOTE } from "../../../note.fixture";
import { NoteForm } from "./note-form";

const meta = {
  title: "Features/Notes/Edit/NoteForm",
  component: NoteForm,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "メモの編集フォームです。送信先はカタログでは差し替えられ、成功を返してその場に留まります。",
      },
    },
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof NoteForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。 */
export const Default: Story = {
  args: { note: NOTE },
};
```

Put stories in the same shape for `NoteList` / `NoteListEmpty` / `NoteListSkeleton` / `NoteDetailView` / `NoteEditView` as well.
To capture the submitting state, have the replaced action return a submission target that never resolves
(`neverSettlingAction` from `~catalog/lib/pending-action`). How to write it is in
[`src/features/README.md`](../../src/features/README.md#putting-it-in-the-catalog) "Putting it in the catalog".

**Screen-level baseline images are captured from route declarations.** Add three to `SCREENS` in `e2e/lib/screens.ts`. The routes the build
outputs are reconciled against the declarations, so **it fails when a route with no declaration appears**.

```ts
export const SCREENS: readonly ScreenDeclaration[] = [
  { route: "/", name: "home", path: "/" },
  { route: "/notes", name: "notes", path: "/notes", signedIn: "user" },
  {
    route: "/notes/[id]",
    name: "note-detail",
    // モックは同じ URL へ同じ応答を返すため、ID を固定すれば中身も固定される。
    path: "/notes/0195f0c2-0000-7000-8000-000000000001",
    signedIn: "user",
  },
  {
    route: "/notes/[id]/edit",
    name: "note-edit",
    path: "/notes/0195f0c2-0000-7000-8000-000000000001/edit",
    signedIn: "user",
  },
  // …以下、残っている宣言
];
```

Points to note.

- **Story-level (`vrt/`) and screen-level (`e2e/visual/`) look at different subjects.** The former is a component rendered alone,
  the latter a screen assembled from components. In both, baseline images are captured only inside the container
  ([`vrt/README.md`](../../vrt/README.md) / [`e2e/README.md`](../../e2e/README.md))
- **Even an intended change turns red first.** The default route for a retake is the PR's `baseline-retake` label,
  and capturing locally and sending is `make vrt-retake` / `make e2e-retake`. Only capturing (`*-update`) leaves the parent's
  gitlink stale, so it passes locally and fails only in CI
- **Baseline images protect a claim only when the fixture holds the values in which that claim shows.** To check wrapping, mix long words with no
  break points into the fixture ([`testing-conventions.md`](../testing-conventions.md#where-visual-claims-are-checked) "Where visual claims are
  checked")

**If in doubt:** rules that come from the catalog's container, such as how to find an overlay or how to split docs pages, are in
[`.storybook/README.md`](../../.storybook/README.md).

**Check:**

```bash
APP_ENV=local pnpm storybook       # http://localhost:6006 で Page/Notes と Features/Notes を開く
make vrt VRT_ARGS='--grep "Notes"' # story を基準画像と比べる（初回は基準が無いので差分として出る）
make e2e E2E_ONLY=notes,note-detail,note-edit
make vrt-retake VRT_ONLY=<id>,<id> # 基準を置き場へ送る。CI では baseline-retake ラベル
```

---

## Step 9 — Write the Promises: Specification and Feature README

**Purpose:** put what the screen promises into documents instead of leaving it to be inferred from the implementation. **A route without a specification
is a gap to fill**.

**Specification.** It mirrors the `src/app` hierarchy as is. No route group is used, so the path is the same as is.

```text
docs/spec/route/notes/
├── layout.screen.md               # layout shell promises (nav / whether there is a sidebar)
├── page.screen.md                 # how /notes looks
├── page.function.md               # functional requirements of /notes
└── [id]/
    ├── page.screen.md
    ├── page.function.md
    └── edit/
        ├── page.screen.md
        └── page.function.md
```

Splitting between functional requirements and screen requirements is decided by one question — **could there be a screen whose backend contract and user purpose stay the same
and only the description differs?** If so, it is a screen requirement; if not, a functional requirement
([`docs/spec/README.md`](../spec/README.md)).

```markdown
# `/notes/[id]/edit` Editing a Note (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Actor and Ownership

**Behind authentication.** Opening it unauthenticated sends the user to login with an instruction to return to this screen. This
route makes the decision (the outer frame's pre-screening is not a line of defense; [0079](../../../../../adr/0079-auth-frontend-seam.md)).

Only the authenticated actor's own notes are returned, and the contract owns the ownership filtering. Other people's notes and notes that do not exist
are both treated as not found, without distinction.

## Fetching

Only `GET /v1/notes/{noteId}`. Fetched through the same endpoint as the detail.

## Saving

Send the title and body to `PATCH /v1/notes/{noteId}` as absolute values. It is not a diff, so resending does not change the result.

**Validation runs the same rules both before sending and after receiving.** The title is required and at most 100 characters; the body is
at most 2000 characters. Per-field wording uses the field name as its subject.

**Only when it was updated first elsewhere (409), add a path to reload.** The reason for the refusal is "it changed elsewhere
since it was loaded", so the next thing to do is not to press again but to look at the current content.

**Do not move away from the screen on success.** The detail and the list are refetched, and success is conveyed by a notification that stays.

## Failures

A fetch failure affects the whole screen and is received by the route's failure surface. A save failure is shown inside the form.
```

Add three rows to the 「いま書いてある画面」 table in `docs/spec/README.md`.

**Feature README.** Copy [`docs/templates/feature-readme.md`](../templates/feature-readme.md) to
`src/features/notes/README.md` and fill it in. The required sections are declared by the template, and `readme-review` reads
that list to score it. In the frontmatter, write `test-requirement: [feature, component, unit]` and the `coverage-exclusions` for
`__mocks__/`.

What you write is **only the lines drawn specifically for this slice, and the index to the contract, specification and design**. The layer's role is held by
[`src/features/README.md`](../../src/features/README.md), what the screen promises is held by the specification, and
how the states look is held by the stories. Writing the same thing in two places lets only one of them rot.

**Check:**

```bash
pnpm lint:md
pnpm exec vitest run --config vitest.scripts.config.ts scripts/doc-links.gate.test.ts
```

---

## Finally

**Commit, and let the hooks and CI judge.** The whole-repository lint, type check, tests and baseline image comparison are run by pre-commit /
pre-push / CI. Running the same thing again locally does not make the result any more correct
([0151](../adr/0151-git-hooks.md)).

```bash
git add -A
git commit   # `/commit` skill があれば、それが prefix と分割を決める
```

## Summary

| Step | Layer | What was written | What was noted | Check |
| --- | --- | --- | --- | --- |
| 0 | — | `make setup-remove-sample` | The line between what remains and what disappears | The purge chain is green |
| 1 | Contract / generation | `openapi/sources.yaml` + `make api-gen` | Do not edit generated artifacts. Fix the contract and regenerate | `make api-gen-check` |
| 2 | `model` | `note.ts` / `note-schema.ts` | `Date` and brands. Display validation uses `zod/mini` | `pnpm exec vitest run src/model/note` |
| 3 | `adapters/server` | `api/notes.ts` | `scope` is the nature of the endpoint. Wire types do not leave here | `pnpm exec vitest run …/notes.test.ts` |
| 4 | `features` | `list/` / `detail/` / `paths.ts` / `load-note.ts` | Separating `page-content` and `view`. Span names | `pnpm check:architecture` |
| 5 | `app` | `layout.tsx` / `page.tsx` / `require-session.ts` / `authz.ts` | Resolve inside the dynamic hole. Protection in two stages: declaration and definitive authorization | `pnpm dev` + `curl` / `pnpm render-mode` |
| 6 | Submission | `actions.ts` + `edit/` | Orchestration only. Failures as return values, switch on `kind` | `pnpm exec vitest run …/actions.test.ts` |
| 7 | Tests | Next to each layer | Do not check the same thing in two layers. 1:1 | `pnpm exec vitest run <target>` |
| 8 | Catalog | `*.stories.tsx` / `e2e/lib/screens.ts` | Everything in `ui/` has a story. A retake is one move, through to sending it | `make vrt` / `make e2e` |
| 9 | Promises | `docs/spec/route/notes/` / feature README | The specification only points; it does not copy | `pnpm lint:md` |

## Where to Go Next

- **Leave it to the templates.** `pnpm gen feature <name> --screen=<screen>` generates the feature skeleton (for the second screen, run the same command again), and `pnpm gen adapter <name>` /
  `pnpm gen component <name>` generate the kernel-side templates. This document is the basis for what the templates should generate,
  and the yardstick for judging what they produce. To build a full set of screens, the `new-feature` skill proceeds in
  the order of work in [`playbook.md`](../playbook.md)
- **Fetch the second and later pages in the browser.** Add the BFF (`app/api/notes/route.ts`) and `adapters/client/api/notes.ts`.
  The route is in [`design/data-fetching.md`](../design/data-fetching.md#fetching-the-next-page-of-a-list) "Fetching the next page of a list"
- **Build a public list.** Make the endpoint `"public"` and hold it across requests with `use cache`. See Step 3's branch and
  [`src/adapters/README.md`](../../src/adapters/README.md)
- **Add validation while typing.** Run the same `noteSchema` on the browser side too with react-hook-form + `standardSchemaResolver`.
  The wiring is in [`design/forms.md#who-holds-the-input-values`](../design/forms.md#who-holds-the-input-values)
- **If you are unsure where something goes**, go back to the three questions in [`design/placement.md`](../design/placement.md)

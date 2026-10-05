# Importing the API Contract

This is where the backend's OpenAPI contract is imported into this repository. The backend owns the contract's SSOT;
this side only **fetches and pins it** ([0072](../docs/adr/0072-api-type-generation.md)).

## Structure

| Path | Role |
| --- | --- |
| `sources.yaml` | Declares the fetch coordinates. A person writes `name` / `repo` / `path` / `ref`; `sha` / `fetchedAt` are written back at fetch time |
| `<name>.gen.yaml` | The fetched artifact. **do-not-edit**. `make api-fetch` overwrites it |

The fetched artifact is determined uniquely by `name` (`api` → `api.gen.yaml`). The declaration cannot specify an output path.
If the name and the location were decided separately, the declaration alone could no longer tell which contract a generated artifact corresponds to.

### Declaration Format

The shape the reader ([`scripts/openapi/sources-manifest.ts`](../scripts/openapi/sources-manifest.ts)) imposes
on a declaration. A declaration that deviates is rejected before the fetch.

| Field | Shape | Reason |
| --- | --- | --- |
| `name` | kebab-case starting with a lowercase ASCII letter | Becomes the fetched artifact's file name. Allowing `.` or `/` would let the location leak out of the declaration |
| `repo` | `owner/repo` | Settled here before it is passed to `gh` |
| `path` | A `/`-separated relative path. Contains no `..` / `?` / `#` | Becomes part of the fetch URL. Allowing `?` would let `path` override the `ref` query, bypassing the version pin from another field |
| `ref` | A non-empty string | A branch, a tag or a commit SHA. How to pin it is in *Pinning `ref`* below |
| `sha` / `fetchedAt` | Not written before the fetch | A state with only the declaration is valid; the first fetch writes them |

- **`name` cannot be duplicated.** A later fetched artifact would silently overwrite an earlier contract, and you could no longer tell which declaration
  a generated artifact corresponds to
- **A `sources.yaml` with zero declarations is rejected on read.** `make api-gen-check` goes through the same reader,
  so it does not pass until coordinates are written
- **Write the reason for the chosen `ref` in a comment next to `ref`.** The write-back inserts only the values without rebuilding the YAML,
  so comments survive repeated fetches. A declaration pinned to a commit SHA loses the basis for moving it next time unless
  a comment says why that commit

## Fetching

```bash
make api-fetch            # sources.yaml の全契約を取得する
make api-fetch NAME=api   # 契約を 1 本だけ取得する
```

Fetching does not include generation. After fetching, generate the types / zod / MSW handlers with `make api-gen`.
`make api-gen-check` detects a fetch left without generation. The commit-time hook
runs only this reconciliation, and CI regenerates and checks the diff as well. Neither goes out to the network
(the drift gate in [0072](../docs/adr/0072-api-type-generation.md)).

Where the generated artifacts live and how to read them is owned by [src/adapters/gen/README.md](../src/adapters/gen/README.md). <!-- sample:line -->

It uses `gh` authentication, so private repositories work too. Fetching goes through the GitHub Contents API,
and the response's `sha` (blob SHA) is used as-is as the basis of the version. When the content changes, the blob SHA
changes too, so the importing side does not need to recompute a hash.

The fetch behaviours that cannot be read from the declaration are these
([`scripts/openapi/fetch-api.ts`](../scripts/openapi/fetch-api.ts) /
[`contents-response.ts`](../scripts/openapi/contents-response.ts)).

- **Passing `NAME=` a name with no declaration fails.** If a typo turned into "zero targets, exited normally",
  a contract you believed fetched would flow into generation still stale
- **Fetches run in parallel; writes follow declaration order.** The contracts do not depend on each other, but if the write order
  shuffled with fetch speed, the same declaration would produce a different diff on every run
- **All bodies to write are assembled before anything is written.** This avoids leaving in the working tree a state where the fetched artifact is new and the declaration
  old, with no way to tell which is right
- **A contract over 1MB cannot be imported.** The Contents API does not return the body of a file over 1MB,
  so the fetch fails there. A response whose decoded size disagrees with the size the API reports is also rejected — generating
  from a truncated contract would make a vanished endpoint disappear from the types in a way indistinguishable from "upstream deleted it"

## Recording the Version

The version is kept in two places.

- `sha` in `sources.yaml` — the full blob SHA. The record of which contract was imported
- `info.version` in the fetched artifact — of the form `2.2.0+aa62bff`. Because **the fetched artifact itself** carries the version, the artifacts generated
  from the contract can be reconciled against it

**What the blob SHA points to is the contract's content, not a backend commit.** Which commit
it came from is held by `ref`. When `ref` names a branch or a tag, the commit it resolved to at that moment
is not recorded, so to trace uniquely down to the commit, pin `ref` to a commit SHA.

`fetchedAt` is the fetch time and plays no part in the version's identity. Re-fetching the same `ref` leaves `sha`
unchanged and moves only `fetchedAt`.

### Only two touches to the fetched artifact

The fetched artifact is upstream's text verbatim, except for the do-not-edit header at the top and the short SHA at the end of `info.version`
([`scripts/openapi/contract-stamp.ts`](../scripts/openapi/contract-stamp.ts)).

- **The YAML is not rebuilt.** If formatting on the importing side rewrote the whole file, differences from upstream would appear beyond the stamp,
  and you could no longer tell "did the importing side touch it, or did upstream change?". For the same reason
  the version string is taken from the original text rather than a parsed value, and whether it is quoted follows upstream's writing
- **Upstream build metadata (after `+`) is dropped and re-attached.** If the version kept growing with every re-fetch,
  the version itself would turn into a record of how many times it was fetched
- **What is required of the upstream contract is that `info.version` is a single-line scalar.** A contract without one,
  or with it written as a block scalar (`|` / `>`), cannot be imported. Only a form where appending characters does not move the end of the value
  can be stamped

## Multiple Contracts

`sources.yaml` can list several contracts. Even with a single backend repository, there is not necessarily
only one contract.

<!-- sample:replace-begin -->
The current declaration is this single one.

| name | Contract | Notes |
| --- | --- | --- |
| `api` | The API of go-boilerplate itself | Admin and general users coexist in it, and it cannot be split mechanically by tags, by `security` or by scope, so it is treated as one unit |
<!-- sample:replace-with -->
<!-- = The declaration is empty. **Using `name` as `api` unchanged is the default.** The fetch target (`api.gen.yaml`) and the version -->
<!-- = reconciliation are derived from `name`, but the generation side spells it out directly, and unless `apiInput.target` / `output.target` / -->
<!-- = `output.schemas` in `orval.config.ts` and `GEN_API_OUTPUTS` in `scripts/openapi/gen-api-plan.ts` are aligned together, -->
<!-- = `make api-gen-check` stops with 「生成物がありません」. -->
<!-- =  -->
<!-- = While the declaration is empty, reading `sources.yaml` is rejected and `make api-gen-check` does not pass either. -->
<!-- = Write the coordinates and finish `make api-fetch` → `make api-gen` before you commit. -->
<!-- =  -->
<!-- = **Whether to split is decided by the contract's own circumstances** — even when admin and general users coexist in one contract, -->
<!-- = if it cannot be split mechanically by tags, by `security` or by scope, treat it as one unit. -->
<!-- sample:replace-end -->

### Adding a contract

Fetching, extraction and reconciliation read the declarations and run per contract, but **the generation side holds each contract's location directly.**
The steps to add one are these.

1. Write `name` / `repo` / `path` / `ref` in `sources.yaml`
2. Fetch with `make api-fetch NAME=<name>` and let it write back `sha` / `fetchedAt`
3. Add two projects to `orval.config.ts` that read that contract's input (`openapi/<name>.gen.yaml`) —
   one that emits the wire types and zod to `src/adapters/gen/<name>/`, and one that emits the client and MSW handlers to `mocks/<name>/`.
   Give them the same shape as the existing one
4. Add `src/adapters/gen/<name>` and `mocks/<name>` to `GEN_API_OUTPUTS` in `scripts/openapi/gen-api-plan.ts`.
   Moving aside and regenerating from empty read this list
5. Generate with `make api-gen`

If you drop steps 3 and 4, type checking and lint still pass while `make api-gen-check` stops with 「生成物がありません」.
The reconciliation looks at `src/adapters/gen/<name>/` and `mocks/<name>/` per contract.
`limits.ts`, which copies only the constants the contract defines, is not created for a contract that has no constants
([0072](../docs/adr/0072-api-type-generation.md)).

**The authentication contract does not live here.** The only things the frontend uses for authentication are the endpoints OIDC Discovery exposes at runtime
([`src/adapters/server/auth/`](../src/adapters/server/auth/README.md)), and none of it passes through
types generated from a contract. There is nothing to import in the first place, so this does not depend on how the IdP was provisioned.

## What to Change When Adopting

The declaration points at the contract of the backend developed as this repository's counterpart. **This is the first place to
switch over to your own backend's contract.**

| What | Default | Where to change it |
| --- | --- | --- |
| Fetch coordinates | `repo` / `path` point at the counterpart's repository and contract path, and `ref` is pinned to a commit SHA | `repo` / `path` / `ref` in `sources.yaml`. Do not write `sha` / `fetchedAt`; let `make api-fetch` write them back |
| Number of contracts and `name` | One, with `name` set to `api` | `sources.yaml`. Changing `name` moves the spelling on the generation side too (below) |
| Generation inputs and outputs | `apiInput.target` / `output.target` / `output.schemas` in `orval.config.ts` spell out the name corresponding to `name` directly | Only when you change `name`, align `orval.config.ts` and `GEN_API_OUTPUTS` in `scripts/openapi/gen-api-plan.ts` |
| Tags that get no client | Excludes the monitoring and diagnostic endpoints (health / ready / version and so on) and internal tags used only as response types | `NON_CLIENT_TAGS` in `orval.config.ts`. It will not fit if the contract tags things differently |

After switching, re-fetch in the order `make api-fetch` → `make api-gen`. A fetch left without generation is
detected by `make api-gen-check`.

The settings that give mocks value ranges the contract cannot express are owned not here but by
[`mocks/README.md`](../mocks/README.md#what-to-change-when-adopting).

## Pinning `ref`

`ref` can be a branch, a tag or a commit SHA, but **pin it to a commit SHA**. The contract you import
is not always on a tag, and pointing at a tag means loosening to a branch whenever you "want a change that has no tag yet",
after which the import moves implicitly. Taking in upstream progress is done explicitly
as a rewrite of `ref`.

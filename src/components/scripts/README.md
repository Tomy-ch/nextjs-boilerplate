---
test-requirement: unit
---

# ui scripts

`components/scripts/` holds the scripts that copy in shadcn/ui, update its provenance records, and check that they track upstream.

**Node-side tooling with no rendering is `unit`.** Without its own declaration, mechanical resolution would inherit `component` from the parent
`src/components/README.md`, and rendering-based criteria would apply here, where there is neither rendering nor a11y
([`scripts/README.md`](../../../scripts/README.md) declares `unit` for the same reason).

## Running

```sh
pnpm add:ui button --as=action
pnpm add:ui dialog --as=overlay -- --yes
pnpm add:ui button --as=action -- --dry-run
pnpm check:ui
```

One component can be added at a time. Before `--` write the component name and the wrapper's own options; after it, the options passed to `shadcn add`. The wrapper moves the `design-system/<component>.tsx` the CLI temporarily outputs to the location matching the layer and the heading. `--path` cannot be specified.

`--as=<heading>` is required and specifies which heading of the component inventory the component is listed under. It is decided before the copy-in because, if postponed, only the work of listing it in the inventory remains once the implementation is finished, and nobody notices until `pnpm check:ui` fails. The headings that can be specified are the same as those of the component inventory in `../README.md`; a wrong value fails before `shadcn add` runs.

## Dependency additions go to the root

The shadcn CLI installs the npm dependencies of the component being copied in with `pnpm add`, but without `-w`. This repository
has a workspace, so pnpm refuses to add to the root, and the copy-in stops **with not a single file written**.
Dependency installation runs before files are written, so it stops for every component regardless of its kind.

The CLI has no way to suppress this, so `npm_config_ignore_workspace_root_check` is set only while `add:ui` runs,
to allow it. It is not placed in `.npmrc` because written there, **every `pnpm add` would silently let an accidental
addition to the root through**. The permission is confined to one run of `pnpm add:ui` and has no effect on a `pnpm add` typed by hand.

## Generated Files for Dependency Components

The shadcn CLI does not know this repository's placement by layer and purpose, so it outputs dependency components to `design-system/<name>.tsx`, and the copied-in component imports `@/components/design-system/<name>`. The wrapper tidies this up after the move.

- For a dependency already copied in, it deletes the generated `design-system/<name>.tsx` and repoints the copied-in component's import to a relative path to the actual file. The relative depth depends on the combination of layer and purpose, so it finds the actual file and computes it
- For a dependency with no actual file yet, it neither deletes nor rewrites anything, and reports the component name on standard output. The generated file and the `@/components/design-system/<name>` import resolve, so type checking passes, but in terms of copy-in order, copy in and audit that component first

Without this tidying, duplicated files and unresolvable imports remain at the same time, and the next piece of work that runs `pnpm typecheck` fails along with it.

## manifest

`../shadcn-manifest.yaml` is the ledger recording how each design system component relates to upstream. `pnpm add:ui` upserts the copy-in entry on success. `--dry-run` does not update it. For an original implementation, `pnpm gen component` records a `kind: original` row together with the template ([`scripts/gen/manifest.ts`](../../../scripts/gen/manifest.ts)). Components created without going through the template, and `reimplemented` / `not-adopted` entries, are added by hand as part of that work.

```yaml
select:
  kind: copy-in
  as: form
  layer: design-system
  directory: src/components/design-system/form/select-client
  registry: https://ui.shadcn.com
  addedAt: 2026-08-02T03:35:28.433Z
  shadcnCliVersion: 4.15.0
  dependencies:
    - radix-ui
  source:
    - repository: shadcn-ui/ui
      path: apps/v4/registry/new-york-v4/ui/select.tsx
      localPath: src/components/design-system/form/select-client/select-client.tsx
      commit: f31ed8198365...
      committedAt: 2026-03-02T08:49:00Z
```

### Names and Locations

**The key is a label pointing at the actual implementation; `registryItem` is the upstream item name.** They are separate concerns, so they sit in separate slots. Folding the upstream name into the key could not express creating two implementations, native and client, from the same item (such as creating `checkbox-native` and `checkbox-client` from `checkbox`).

- **key** — As a rule, the directory name of the implementation. Qualify it only when names collide, as with `patterns/table` and `design-system/display/table` (`table-columns`)
- **`registryItem`** — The upstream item name. `original` has no upstream, so it is **not written**
- **`directory` / `localPath`** — Where the implementation lives. It is not inferred from the name, so moving or renaming the implementation does not break the mapping, and both missing records and stranded entries can be detected
- **`dependencies`** — The external packages the implementation actually imports. It records what the placed implementation references, not what the registry declared should be installed. Rewrites at copy-in and original implementations change the references, so the declaration and the reality do not match. `react` / `react-dom` are the runtime every component assumes, so they are not counted, and `next/image` counts as `next`. If there are no references, it is not written
- **`as`** — The heading it is listed under in the component inventory. It expresses the purpose

`layer` and `as` are not folded together. **`layer` is "who rewrites it" and `as` is "what the component is for"** — different axes. Only `design-system` has intermediate directories by purpose; `patterns` and `app-starter` hold things whose purpose cannot be settled on one, so they are not split. `directory` can be derived from these two, so `pnpm check:ui` cross-checks it (nested components are excluded, since their parent decides their location).

Right after `pnpm add:ui` records it, the key and `registryItem` match. If the implementation is renamed or moved after the copy-in, update the key and `directory` to follow, and leave `registryItem` as the upstream name.

`pnpm check:ui` checks whether the presence of `registryItem` agrees with `kind`, whether a declared `registryItem` matches the file name in `source[].path`, whether the `dependencies` declaration matches the implementation's imports, and whether `as` is a heading in the inventory. The conventions are kept by checks, not by explanation.

`pnpm add:ui` does not rewrite the whole ledger; it replaces only the target entry. Re-serializing the whole document would erase, every time, the comments recording the reasoning behind decisions.

### kind

| Value | Meaning | `source` | When upstream moves |
| --- | --- | --- | --- |
| `copy-in` | Copied in from the registry and kept as something that tracks upstream | Yes | Read the diff and copy it in if needed |
| `reimplemented` | An equivalent upstream item exists, but it was reimplemented here to fit this repository's requirements | Yes | Not tracked. Read the diff as material for review |
| `original` | No equivalent upstream item exists; built here from the start | No | Nothing |
| `not-adopted` | Decided, after consideration, not to build. Has no implementation | No | Nothing |

`kind` is split because "not in the manifest" alone cannot distinguish **an original implementation from something not yet copied in**.

`not-adopted` is the flip side, distinguishing **"was it considered, or not looked at yet"**. With no implementation it has no `layer` / `as` / `directory`, and instead `reason` and `revisitWhen` are required. `revisitWhen` is required because a "won't do" whose condition cannot be written is not a decision but a postponement. When rejecting a candidate that does not exist in the registry, it has no `registryItem` either.

The decision itself lives in the `README.md` of the component that took over the responsibility. The ledger holds only "the fact that this name was considered" and "when to reconsider". `pnpm check:ui` excludes this kind both from the cross-check against implementations and from upstream tracking.

### Why the commit is recorded

`addedAt` and `shadcnCliVersion` represent when this side ran it, and do not show which upstream point the copied-in content came from. `source` carries that. The JSON the registry serves is the upstream repository's file itself, and the item declares its own location as `files[].path`, so this side does not build the path.

The CDN's `last-modified` is the cache fill time, not the content's modification date. `etag` is effectively a hash of the body, but depending on `Accept-Encoding` it turns into a weak validator (with `W/`), so it is not used as a value recorded and compared over the long term.

Resolving `source` requires talking to the registry and the GitHub API. Even when it cannot be fetched, the addition itself completes; the entry is recorded without `source` and the reason is reported on standard output. Copying it in again after the network recovers records it.

## Detecting Undefined Classes

`pnpm check:classes` ([`check-classes.ts`](./check-classes.ts)) builds `src/app/globals.css` and checks whether every class written in `.tsx` files under `src/components` appears in the output. Tailwind silently ignores classes it does not recognize, so unless a machine checks this, defects reach the browser.

There are three key points to the check.

- **Matching is done in selector form.** `focus-visible:outline-2` is output as `.focus-visible\:outline-2`, so searching for the bare string would miss classes with variant modifiers
- **Candidates are taken only from the `className` attribute and the arguments of `cn()` / `cva()`.** Picking up every string in a file would include `data-slot` values and even `role`. Comparison operands mixed into the same area (`orientation === "horizontal"`), variant names in `defaultVariants`, and index keys are excluded from the candidates
- **Classes that intentionally have no CSS go in `KNOWN_WITHOUT_CSS`.** This only removes them from the findings; they are not removed from the implementation

## Upstream Tracking Check

```sh
pnpm check:ui             # 整合性 + 上流の追従確認
pnpm check:ui --offline   # 整合性だけ（通信しない）
```

When run, it first checks the ledger's consistency. It cross-checks the declared `directory` / `localPath` against the implementations,
and looks for directories with no record, entries that lost their implementation, entries declaring the same location twice, and mismatches between `kind` and
`source`. If there is a problem here, it ends without network access.

**The ledger covers every layer under `src/components`.** Not only `design-system` but also `patterns` /
`shell` / `app-starter`. It does not enumerate layer directories;
**it treats a directory that has a `README.md` as a component**. Enumerating layers would require fixing this script every time
a layer is added, and a layer someone forgot to add would silently drop out of the ledger. With this
rule, nested components (`patterns/table` and those under it) and components moved between layers also show up as missing records.
The basis for the rule is the convention "co-locate a README with each component" in
[`components/README.md`](../README.md).

If there are no problems, it compares the recorded commit with the latest upstream and lists the components that moved. `original` has no upstream, so it is not checked. `copy-in` is shown as `要追従` and `reimplemented` as `参考`, distinguished. **When upstream has moved, or when some check failed, it ends with exit code 1.** This is the same treatment as `make actions-pin-check` failing on a pin mismatch.

It sends as many requests to the GitHub API as there are records, so the unauthenticated 60 req/hr is not enough. It uses `gh`'s authentication, so running it requires `gh`.

CI splits it in two in [`shadcn-drift.yaml`](../../../.github/workflows/shadcn-drift.yaml).

- **Ledger consistency** — Runs on pull requests that touch `src/components/**`. It needs no network, and its cause also lies in the change under review, so it is fine for this to fail
- **Upstream tracking check** — Runs only on the weekly Monday schedule and `workflow_dispatch`, not on pull requests. Upstream drift is not caused by the change under review, and failing a PR on it would stop work for a reason the author cannot fix

## Bringing in upstream changes

The copied-in implementation carries fixes to TSDoc, import paths and types, so new upstream content cannot simply overwrite it. With the recorded commit, a 3-way merge using the original as of that time as the base is possible. **There is no need to keep the original in the repository.**

```sh
# base   = 取り込んだ時点の原本（manifest の source.commit）
# theirs = 上流の最新
# ours   = このリポジトリの実装
REPO=shadcn-ui/ui
PATH_IN_REPO=<source.path in manifest>
BASE_SHA=$(<source.commit in manifest>)

curl -sS "https://raw.githubusercontent.com/$REPO/$BASE_SHA/$PATH_IN_REPO" -o /tmp/base.tsx
curl -sS "https://raw.githubusercontent.com/$REPO/main/$PATH_IN_REPO" -o /tmp/theirs.tsx
cp "$(<source.localPath in manifest>)" /tmp/ours.tsx

git merge-file /tmp/ours.tsx /tmp/base.tsx /tmp/theirs.tsx
```

Resolve only the conflicting places by hand and bring the result back into the implementation. After bringing it in again, update `source.commit` in the `manifest` to the new commit (copying in again with `pnpm add:ui <component> --as=<heading> -- --overwrite --yes` updates it automatically, but that also erases fixes such as TSDoc, so the 3-way merge fits the reality better).

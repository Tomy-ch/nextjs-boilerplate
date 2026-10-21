# Type Generation (API Schemas)

This ADR defines the policy of **generating types + runtime validation (zod)** from the backend's `openapi.gen.yaml`, and **the generator / placement of generated artifacts / do-not-edit / the ban on type leaks / the intake pipeline (fetching with gh + short SHA stamp) / the generated-artifact drift gate**.

## Status

Accepted

## Context

This ADR settles whether API types are generated from OpenAPI or hand-written, the choice of generator, and the handling of generated artifacts. The premise is "do not duplicate API types in several places / do not hand-write files that should be treated as generated".

The backend **commits `openapi.gen.yaml`, a bundle of its modular spec, as a cross-repo contract artifact** ([0070](0070-backend-role-separation.md) contract SSOT). The frontend is its consumer; it fetches the committed file through the GitHub API (the `gh` CLI) and does the generation itself. This ADR defines this consumer side.

**Not types only (openapi-typescript) but types + runtime validation (zod) are generated.** Under the ownership of boundary values ([0070](0070-backend-role-separation.md)), responses have no server-side runtime validation, and the frontend's generated validation becomes the last line of defense against contract breaches. Types alone cannot detect contract breaches at runtime.

## Decision

### Generate types + runtime validation (generator = orval)

- API types are **generated from the backend's `openapi.gen.yaml`** (hand-written duplication forbidden). The generated artifacts are **zod schemas + types derived via `z.infer`**
- **Generator = orval** (outputs zod schemas + TS types with one generator). Exact pin / `pnpm audit` follow [0004](0004-library-management.md)'s adoption flow
- Responses get runtime validation with zod `.parse()` at the `adapters` boundary ([0070](0070-backend-role-separation.md) ownership of boundary values / [0071](0071-bff-api-integration.md) is the receiving point)

### Placement of generated artifacts / do-not-edit

- Generated artifacts are placed in **`src/adapters/gen/`**. Generated wire types and zod schemas are owned by `adapters` (the owning boundary of external connection and conversion; [0021](0021-frontend-responsibility.md)), so they are colocated inside it. Generated artifacts are placed inside the owning layer, and no dedicated place for generated artifacts is set up directly under `src/`. The directory name `gen/` is the industry-customary name for a home of generated artifacts
- This is **a generation-only subdirectory inside the `adapters` kernel**, and does not count as "adding a new kernel directly under `src/` to the 11-kernel structure", for which [0027](0027-directory-structure.md) requires an amendment (no amendment needed)
- **Generated artifacts are committed.** That way contract changes appear in review as diffs of the generated artifacts, and in exchange the drift gate (below) rejects hand edits and missed generation
- **Hand editing is forbidden (do-not-edit)**. `src/adapters/gen/` is always overwritten by regeneration from the generation input (`openapi.gen.yaml`). Neither humans nor AI edit it

### Ban on type leaks

- Generated types and zod schemas (generated wire types) are **not leaked into inner layers (`model` / feature domain logic)** ([0020](0020-adopted-architecture.md) design principle 3)
- Conversion happens at the owning boundary = **`adapters`**, into our own display view types ([0021](0021-frontend-responsibility.md) `model`). "OpenAPI constraints = a wire contract, not a domain rule" is maintained ([0070](0070-backend-role-separation.md))

### Intake pipeline (fetching with gh + short SHA stamp)

1. **At setup (once)**: the **backend repository name**, the **path to `openapi.gen.yaml` from the repository root** and the **ref to fetch** are stored in this repo as **a static manifest (configuration file)**. The manifest **can declare several contracts**. Even with one backend repository there is not necessarily one contract (e.g. the core API, and an API versioned independently as a separate service), and each contract's version moves independently
2. **At fetch time (a `make` or `pnpm` command)**: **the contract is fetched via `gh`** from the manifest's coordinates and copied into this repo. The basis for the version is **the blob SHA the GitHub Contents API returns**; **the full SHA is stamped into the manifest, and the short SHA at the end of `info.version` of the fetched spec**. The blob SHA is a hash of the contract file's content itself — it changes when the content changes and stays the same when it does not — so "which contract was taken in" is uniquely determined without recomputing a hash on the intake side. **What this SHA points to is the content of the contract, not a backend commit**. Which commit it was taken from is held by the manifest's `ref`
3. With the fetched spec as input, **orval generates zod + types into `src/adapters/gen/<contract-name>/`**. A level is cut per contract so that cross-checking and regeneration can run per contract. After generation, formatting / typecheck / lint are chained
4. The generator requires an output destination for an HTTP client, but **the generated client is not adopted**. Outbound resilience is owned by the hand-written wrapper in `adapters/server` ([0071](0071-bff-api-integration.md)), so the generated client is placed on the `mocks/` side together with the contract-driven mocks, and `src/adapters/gen/`, which production references, holds only wire types and zod schemas
5. **Generated artifacts are excluded from linting; only formatting is applied**. Imposing conventions on code that has no writer would stop CI on the generator's output style every time the contract changes, leaving a patch to the generator as the only fix. The correctness of generated artifacts is guaranteed by the drift gate (below)

### CI gate for generated-artifact drift

There are two failures to detect, and **there is no refetch** (fetching the contract is a deliberate act; the gate does not advance it on its own).

1. **Generated artifacts were hand-edited / generated from something other than the contract taken in / still present after disappearing from the contract** — **regenerate from the fetched contract and fail if a diff appears**
2. **The contract was fetched but not generated** — cross-check the manifest's blob SHA with the version stamp the generator copies into the generated artifacts' headers. It involves no generation, so it can also run in a hook

1 subsumes 2, but 2 can name where the failure is. Both are kept.

**Stale generated artifacts are not regenerated and committed by a bot; the drift check turns them red and a person handles it.** Not only these types but every generated artifact in this repository (tokens and copies of UI components too) is guarded by the drift check failing. A workflow that commits regeneration needs `contents: write`, breaking the shape of [0153](0153-ci-configuration.md), which narrows the top level to `contents: read`. In addition, stacking "a bot regenerates" on top of "red until a person regenerates" makes it impossible to answer what the drift check is checking. This is reconsidered only when generated artifacts reach a volume or frequency that people cannot keep up with by hand; the growth of generated artifacts itself is not a reason — as long as it can turn red and a person can handle it, the drift-check side is enough.

What 1 looks at is **all three of additions, changes and deletions**, and for that two conditions are set.

- **Cross-checking uses `git status`, not `git diff`.** When a schema is added to the contract, the generator writes **a new file**, and being untracked it is invisible to `git diff`. That would let through the very change the gate exists for
- **Regeneration is done after emptying the output** (`make api-gen`). With overwriting alone, files corresponding to schemas that disappeared from the contract are left untouched, and since their contents do not change, the cross-check passes too. **Things not in the contract squat while posing as generated artifacts**. It is not left to the generator's clean feature because that is a per-project setting, and in a project that outputs to a single file it would also wipe the output of another project at the same level — **cleaning up orphans is made independent of the shape of the output**

### Constraint constants go into a module separate from validation

In the generated zod schemas, the limits and formats the contract defines also appear as `export const` constants (`...Max` / `...RegExp`, etc.). **The client needs these constants** — they decide input field limits and fetch counts — but **does not need validation**.

The generated artifact holds the schemas and descriptions of every endpoint in one file, so **importing one constant ships the whole thing to the browser** (measured: 14.8 KB gzip for the generated schemas and `.describe()` text alone, plus 63.5 KB for classic `zod`).

Therefore, **at the end of generation, a constants-only module (`limits.ts`) is produced, and the client pulls only that**.

- **Only declarations that do not reference zod are copied.** The accepted shapes are not enumerated; the only filter is "does it pull zod". The generator emits constraints in various shapes — numbers, strings, template literals, `new RegExp(...)` — so accepting by enumeration would silently drop constants every time a shape changes
- **The contract's version stamp is copied over.** The version cross-check looks at the whole directory of generated artifacts, so a single file without a version fails as "the generator stopped writing the version"
- **It names this procedure, not the generator, as its origin.** Copying orval's header would make a file that does not come out of orval on regeneration claim to be orval's output
- **Contracts with no constants at all do not get the file written.** If a header-only file remained, readers would have to judge "is extraction broken, or does the contract hold none". Lean toward **every file that exists always has contents**
- **Recurrence is watched by a machine.** Tracing from client islands, it fails if any module pulls either `zod`'s default entry point or the generated zod schemas (`scripts/client-schema-weight.gate.test.ts`). The budget ([0101](0101-performance-budget.md)) catches the total but **does not answer why it grew**, so the check is also placed on the cause side

### Fix the type at the boundary

The generated schema's `parse` is passed once at the boundary, and from then on the value is passed inward **as a fixed type**. This discipline itself is held by [0029](0029-type-design-discipline.md); this ADR defines that the generated schemas are its executor.

## Prohibitions

- ❌ Duplicating API types by hand (SSOT = the backend's `openapi.gen.yaml`) (Enforcement: Prose — **not mechanizable**. Whether a hand-written type is a copy of the contract is decided by meaning, not by matching shape, and it cannot be told apart from a view type of our own that happens to have the same shape)
- ❌ Hand-editing generated artifacts under `gen/` (do-not-edit)
- ❌ Leaking generated types or zod schemas into inner layers such as `model` (conversion is at the `adapters` boundary) (Enforcement: ESLint boundaries (`adapters-gen` in `RESTRICTED_AREAS` of `architecture.ts`) rejects direct imports of generated artifacts from `model` / `features`. Passing them through via the public surface of `adapters` is Prose — **not mechanizable**. Whether the type the public surface returns is a generated type or our own view type is decided by the origin of the inferred type, not by the shape of the import)
- ❌ Hard-coding fetch coordinates outside the manifest (coordinates are managed in the static manifest) (Enforcement: Prose — **mechanizable** (a scan could reject literals of the contract's coordinates (repository name and the path of `openapi.gen.yaml`) appearing outside `openapi/sources.yaml`; no rule exists))
- ❌ Running with committed generated artifacts without a drift gate

## Notes

- Of the directional invariant "request ⊆ domain ⊆ response" in the ownership of boundary values ([0070](0070-backend-role-separation.md)), what the frontend guarantees is validation on the response side (the last line of defense)

## Related ADRs

- [0070-backend-role-separation.md](0070-backend-role-separation.md) — contract SSOT / ownership of boundary values / the basis for carrying runtime validation (this ADR's parent decision)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — where the generated zod schemas are used (`.parse()` at the adapters boundary)
- [0020-adopted-architecture.md](0020-adopted-architecture.md) — the ban on type leaks (design principle 3) / [0021](0021-frontend-responsibility.md) — the `adapters` conversion boundary, `model` view types
- [0004-library-management.md](0004-library-management.md) — exact pin / audit of generators such as orval
- [0153-ci-configuration.md](0153-ci-configuration.md) — the workflow and CI wiring of the generated-artifact drift gate
- [0155-claude-skills-development.md](0155-claude-skills-development.md) — where setup-script skills live (the setup part of this pipeline)

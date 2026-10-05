# Spec-Driven Development

This project keeps **what a screen promises** as a specification and derives the implementation from it. Specifications live in `docs/spec/route/**` and are split per screen into two tiers: functional requirements and screen requirements. The details of placement and writing are owned by [`docs/spec/README.md`](../spec/README.md); this ADR settles their adoption and the decision **not to have** a path that machine-generates an implementation skeleton from specifications.

Where [0140](0140-documentation-operations.md) owns how documents are operated and [0141](0141-portal-operations.md) owns the portal, what this ADR owns is whether the specification, as a kind of document, is adopted and what role it plays.

## Status

Accepted

## Rationale / Purpose

- **Decide where promises live.** A screen's promises (when it renders and why, how waiting boundaries are placed, where caveats go, the order of sections) tend to scatter across documents, code and doc comments. The value of having specifications is not speed of generation but that the settled promises get exactly one place to live
- **Aim for a state where the same screen can be rebuilt by reading the specification alone.** Making readers infer the promises from the implementation leads each reader to reconstruct different promises
- **Separate what the contract decides from design judgments so each can be replaced.** When they are mixed, one cannot be replaced without the other

## Having specifications

**What has a specification is a screen (a route in `src/app`).** Kernels and components have their vocabulary held by READMEs and Storybook and are not subjects of specifications.

- **They live in `docs/spec/route/**`**, mirroring the hierarchy of `src/app` as is. Route groups drop their parentheses, and dynamic segments keep their square brackets. A layout's specification applies to everything beneath it, and promises spanning screens are written once, in the higher `layout.*.md`
- **Each screen is split into two tiers: functional requirements (`*.function.md`) and screen requirements (`*.screen.md`).** The sorting question is one — could there be a screen whose backend contract and user goal are the same while only this statement differs? If so, it is a screen requirement; if not, a functional requirement
- **A screen with no functional requirements gets no `page.function.md`.** An empty file erases the distinction between "not written yet" and "there is none"

## Point, do not copy

A specification **only points** at the following and does not copy their content. Once copied, a fix has to be applied in two places.

| Points at | What it holds |
| --- | --- |
| Contract (OpenAPI) | Types, errors, limits |
| Tokens | Values (band widths, etc.) |
| [`rules.md`](../rules.md) | Rules enforced day to day |
| Component README + Storybook | Component vocabulary |
| ADR | The choice of mechanism and its reasons |

So a specification does not contain component names, numbers with units, rules that span layers, implementation steps, or operations not specific to the screen. What it contains is observable promises and **the reasons for not doing something**. A sentence such as "no endpoint for filtering by status is provided" is itself the judgment not to provide it even though the contract has the endpoint, and this is the core of a specification's value.

## Implementation is derived from the specification

- **A specification records settled promises.** So the time it can be written is after the look is settled; in the order of screen implementation ([`docs/playbook.md`](../playbook.md)) it comes after the story has passed review and the assignment to layers is done. **Settling the specification first is not enforced** — settling it first means rewriting it every time the look moves
- **A screen is not sent for review until its specification is finished.** Sending a screen whose promises are not written makes readers infer the promises from the implementation
- **A feature's README points at the specification pair for each route** ([feature README template](../templates/feature-readme.md)). `readme-review` reconciles whether the targets exist
- **A specification is an input to be read.** What can derive an implementation from prose is not a scaffold but the one who reads and judges (people and the `new-feature` skill — [0155](0155-claude-skills-development.md))
- **A change that alters a promise fixes the specification in the same change.** When the specification and the implementation disagree, fix the specification if the promise was changed; if it was not, treat it as an implementation defect

## No generating scaffold

No path is provided to machine-generate an implementation skeleton from specifications.

1. **Specifications have no machine-readable structure, and should not be given one.** Their content is prose of judgments, and their core value is in "the reasons for not doing something". Making them a generator's input would mean pushing them toward structured data, and that part would be lost
2. **What a specification records is an observable contract, not a mechanism.** From "a value equal to the default is not put in the URL", an implementation that represents the default as an empty string cannot be derived. Only someone reading both the specification and the contract can derive it
3. **Keep generation to one input.** The inputs of `pnpm gen` are `architecture.ts` and the layer READMEs ([0021](0021-frontend-responsibility.md) / [0027](0027-directory-structure.md)); adding specifications as a second input would double the source of truth for structure

A generator carries none of the value of having specifications (that promises get a place to live). Something placed for speed begins, the moment it is placed, to bend the specification toward the generator's convenience.

## Reconciling specifications and implementation — two checks

That specifications match the implementation is checked by the following two checks. **Reconciling existence is owned by a machine; reconciling content is not** — the latter has no evaluator and can be seen only by reading the two side by side. So as not to count what is not inspected as a "no violations" green ([0157](0157-inspection-declaration-discipline.md)), which is which is written here. [`docs/traceability.md`](../traceability.md) counts only `rules.md` lines and issues, so this distinction lies outside the tally.

### Existence check (machine)

A check that reconciles the correspondence between the routes in `src/app` and `docs/spec/route/**` by machine.

- **Population**: every `page.tsx` / `page.dev.tsx` / `layout.tsx` under `src/app/**`. **Development-only routes also carry promises** — being excluded from the build ([0113](0113-development-access-surface.md)) and carrying no promises are different things. Each is converted to a specification path by the mapping in [`docs/spec/README.md`](../spec/README.md) (drop route-group parentheses; dynamic segments keep their square brackets)
- **Verdict**: each route has a `*.screen.md`. A `*.function.md` may be absent (a screen with no functional requirements gets none). In the other direction, a specification with no route is reported as a failure — that is the state where a screen was deleted and only its promises remain
- **How it fails**: if routes are enumerated as 0, it fails rather than reporting "no violations" ([0157](0157-inspection-declaration-discipline.md))

The implementation is [`scripts/spec-routes.gate.test.ts`](../../scripts/spec-routes.gate.test.ts), and the mapping and verdict are held by [`scripts/lib/spec-routes.ts`](../../scripts/lib/spec-routes.ts). **There is exactly one implementation of the mapping** — with two, only one of them would follow the rules.

### Content check (reading side by side)

Read the specification's promises against the implementation and list the disagreements. Fix the specification if the promise was changed, the implementation if it was not (see "Implementation is derived from the specification" above).

- **It cannot be mechanized.** Promises are prose of observable contracts and are not given a machine-readable structure (a decision of this ADR). Whether the prose matches the rendered result is the reader's judgment
- **When**: reading every screen once is enough; after that, only the screen in question is read on each change that alters a promise. This holds independently of the decision not to have a generating scaffold
- **Entry point**: the `verify-spec` skill. It runs read-only validators per route in parallel and reports four kinds (a disagreement between promise and implementation / misfiled tier / restating a higher layout / something written that should not be). **It does not decide which side should move** — the direction above is fixed, but whether the promise changed or the implementation drifted cannot be seen from reading. **A promise that could not be confirmed is reported as unconfirmed** ([0157](0157-inspection-declaration-discipline.md))

## Rejected Alternatives

| Option | Reason |
| --- | --- |
| **A scaffold that generates a skeleton from specifications** | As above. The core of a specification's value (the reasons for not doing something) is lost for the sake of generation |
| **Pushing specifications toward structured data (frontmatter / schema)** | Only the machine-readable part reaches the generator, and the prose judgments become second-class |
| **Making specifications a second input of `pnpm gen`** | The source of truth for structure would be in two places: `architecture.ts` and the specifications |
| **Enforcing specification-first (write it, then implement)** | Promises made before the look is settled are not settled. They get rewritten every time it moves |
| **Housing a screen's promises in the feature README** | A README holds the slice's role and placement. Mixing promises in leaves no home for layout promises that span routes |

## Prohibitions

- ❌ Placing a path that machine-generates an implementation skeleton from specifications (Enforcement: none — a decision not to adopt. No path generating a skeleton from specifications is in place, and a change adding one shows up in the diff as an added generator)
- ❌ Adding `docs/spec/**` to the generation inputs of `pnpm gen` (Enforcement: none — a decision not to adopt. The only inputs of `pnpm gen` are `architecture.ts` and the layer READMEs, and a change adding specifications shows up in the diff as an added generator input)
- ❌ Writing component names, numbers with units, rules that span layers, or implementation steps in a specification (the targets it points at own them)
- ❌ Placing an empty `page.function.md` (Enforcement: Prose — **mechanizable** (`scripts/spec-routes.gate.test.ts` can detect a `*.function.md` whose body is only headings. No rule exists))
- ❌ Sending a screen for review without writing its specification
- ❌ Settling a specification before the look is settled (Enforcement: Prose — **not mechanizable**. Whether the look is settled is a judgment at the time of the work and does not appear in code)

## Related ADRs

- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — layer READMEs (the input of `pnpm gen`)
- [0027-directory-structure.md](0027-directory-structure.md) — the hierarchy of `src/app` (the structure the specification location mirrors)
- [0054-ui-catalog-storybook.md](0054-ui-catalog-storybook.md) — component vocabulary (specifications do not copy it)
- [0070-backend-role-separation.md](0070-backend-role-separation.md) — the backend contract (what specifications point at)
- [0072-api-type-generation.md](0072-api-type-generation.md) — the contract's generated types
- [0140-documentation-operations.md](0140-documentation-operations.md) — documentation operations (specifications follow them too)
- [0141-portal-operations.md](0141-portal-operations.md) — portal
- [0144-decision-enforcement-pairing.md](0144-decision-enforcement-pairing.md) — stating a decision together with its enforcement (the distinction between "mechanizable but not implemented" and "not mechanizable" in the "Reconciling specifications and implementation — two checks" section)
- [0157-inspection-declaration-discipline.md](0157-inspection-declaration-discipline.md) — discipline for declaring inspections (how the existence check fails; not counting the unimplemented outside the tally as green)
- [0155-claude-skills-development.md](0155-claude-skills-development.md) — the `new-feature` skill (uses specifications as an input to be read)

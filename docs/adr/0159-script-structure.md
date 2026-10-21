# Language and Structure of Helper Scripts

This project defines the language and structure of the **tools that inspect, generate and operate the repository** — gates, lint, generators, pin resolution, setup. They are not application behavior, so they do not ride on the physical placement of `src/` defined by [0027](0027-directory-structure.md), and they are on the called side of the CI wiring defined by [0153](0153-ci-configuration.md). This ADR fills the gap between them.

The scope is both `scripts/` directly under the repository and `**/scripts/` placed near a system, kernel or feature.

## Status

Accepted

## Rationale / Purpose

- **Helper scripts turn silently green when they break.** What lives here is the lint and gates themselves, and when broken they fall toward reporting "no violations" ([0157](0157-inspection-declaration-discipline.md)). There is reason to inspect them more strictly than application code, but none to inspect them more loosely
- **Inspection does not work when judgments are buried in the entry point.** A script whose judgments are mixed into receiving arguments and calling child processes cannot be run in isolation, and even when run, can only confirm "it called the substituted thing"
- **Answer where the next one of the same kind goes.** Whether to place it directly under the repository or near its responsibility is not adjudicated each time

## Write them in TypeScript

Helper scripts are written in TypeScript and run with `tsx`. Callers (scripts in `package.json` / recipes in `.makefiles/` / git hooks / workflows) are also aligned on running with `tsx`.

- **They fall within inspection.** Mixing in shell or plain JS takes them out of what `pnpm typecheck` and biome inspect. Do not create a state where the tools for inspecting sit outside inspection
- **There is one execution system.** Running needs only Node and `tsx`, called with the same spelling in every environment
- **Do not bring in shell environment differences.** Shell dependencies outside mise management (differences in coreutils, etc.) cause results to disagree between local and CI

### Exceptions kept in shell

Things with the following requirements stay in shell. Whether something qualifies is judged case by case, and what does not qualify is converted to TypeScript.

- Things whose requirement is **to run standalone before dependencies are installed**. Headless drivers meant to be copied unedited into other repositories fall here
- **Things called from an agent's hook whose requirement is to always answer immediately.** The judgment is advice to the editor and must not wait for an execution system to start

The exceptions stay within the agent tooling (`.claude/` / `.agents/`) and are not placed in `scripts/`.

## 1 tool = 1 directory

Directly under `scripts/` is **1 tool = 1 directory**, with `scripts/<tool>/index.ts` as the entry point. Calls are per directory (`tsx scripts/<tool>`), without spelling out the file name.

- Judgments shared by several tools go in `scripts/lib/`. **What is called from only one tool is not promoted to shared**
- Tools used for initialization are grouped under `scripts/setup/<tool>/`, and judgments shared only by that group are held by `scripts/setup/lib/`
- A group of tools needing several entry points in one directory is allowed as an exception, but this is stated in the entry-file exclusion declaration (see "Make the 1:1 export-to-test mapping a gate" below)

## Separate entry points from judgments

The entry file handles **receiving CLI arguments, exchanges with the outside, and the exit code**, and judgments that can be made without those are cut out into a judgment module in the same directory. Tests are attached to the judgment module.

**The line is drawn at "can the answer be produced without an exchange", not at size or number of branches.** A shape that decides the next step from a child process's result or a socket's response can, even made pure, only confirm "it called the substituted thing", so it stays in the entry point. Conversely, the part that derives violations from an already-read string or syntax tree is shaped to have neither fs nor processes and placed in the judgment module.

Judgments that read documents coming from outside (tool output, registry responses, git output) include malformed input among their perspectives. Degrading to 0 items would read as "no failures" ([0157](0157-inspection-declaration-discipline.md)).

## Make the 1:1 export-to-test mapping a gate

The one-subject-one-test rule of [0090](0090-testing-strategy.md) — every callable export has exactly one top-level `describe` with its own name — is imposed on helper scripts too and judged by machine.

- **The suite is separate from the application's.** So that a failure is not misread as an application regression, both the run and the CI job are separate. Coverage is required at 100%, and the population is all `.ts` under `scripts/`, not a directory listing — to avoid a tool directory silently falling out of the population when added
- **The gate's scan is not limited to `scripts/`.** The same gate walks the directories where TypeScript with judgments lives (`src/`, `tokens/`, `mocks/`, `vrt/`, `e2e/`, the custom ESLint rules, the catalog configuration). Narrowing the scan to scripts would leave judgments placed elsewhere never inspected
- **What cannot have an entry point is declared together with the reason for its exclusion.** Entry files, artifacts generated from contracts, and modules with no judgments are listed, with a reason and removal condition, in the single declaration that the coverage population and the 1:1 gate read as the same array. Only what the inspection is meaningless for is excluded, and "not written yet" is not a reason ([0157](0157-inspection-declaration-discipline.md))
- **The gate walks from both sides.** Walking only from the source side leaves test files with no corresponding source without an entry point, and what is placed there is never inspected. Tests without a subject (checks against handlers generated from contracts, gates for the development machinery itself) may exist, but require a declaration

## Using `scripts/` versus `**/scripts/`

| Location | What goes there |
| --- | --- |
| `scripts/` | Helper scripts that concern the whole repository but **do not belong to the responsibility of a particular system, kernel or feature** |
| `**/scripts/` | Scripts for generation, inspection and conversion that a particular system, kernel or feature protects. **Co-located near that responsibility** |

The judgment is made by "when it breaks, who fixes it". Generating and inspecting tokens is the responsibility of the token system itself, which handles the token SSOT and generated artifacts, so it goes in `tokens/scripts/`; copying in UI components and inspecting their provenance is the responsibility of the `components` kernel, so it goes in `src/components/scripts/`. Repository-wide gates (the 1:1 mapping, broken links, reconciling pins) belong to no responsibility, so they go in `scripts/`.

For co-located scripts, the README on the responsibility's side holds the perspectives (`test-requirement`), and judgment modules and tests sit side by side in the same directory. **1 tool = 1 directory is a convention directly under the repository; near a responsibility, entry points and tests may be placed flat** — what is there is the scripts of one responsibility, not a group of tools. Calls go through the script names in `package.json`.

## Rejected Alternatives

| Option | Reason |
| --- | --- |
| **Writing them in shell / plain JS** | They fall out of type checking and lint. Only things that fall under "Exceptions kept in shell" above |
| **Burying judgments in the entry point** | They cannot be run in isolation, and even when run can only confirm that the substituted thing was called |
| **Narrowing the gate's scan to `scripts/`** | Judgments placed elsewhere are not inspected |
| **Making a README's listing of actual files a gate** | It only constrains how the README is written and does not prevent rot. Structural drift is left to the judgment of README synchronization |
| **Having a suite per tool** | Taking the coverage population as everything in one suite is what prevents leaks from the population |

## Prohibitions

- ❌ Placing shell or plain JS under `scripts/` (Enforcement: Prose — **mechanizable** (a gate test enumerating `.sh` / `.js` / `.mjs` under `scripts/**` can reject them. No rule exists))
- ❌ Writing judgments into an entry file that can be made without an exchange (Enforcement: Prose — **not mechanizable**. Whether a judgment can be made without an exchange is decided by the meaning of the processing)
- ❌ Placing a judgment module without a corresponding test
- ❌ Excluding anything other than entry files from inspection in a form lacking a reason and removal condition (Enforcement: Prose — **mechanizable** (check in the syntax tree whether each array in `scripts/lib/untested-modules.ts` has a doc comment stating the reason and removal condition. No rule exists))
- ❌ Placing a script that a particular responsibility protects in `scripts/`, or the reverse (Enforcement: Prose — **not mechanizable**. Which responsibility protects a script is decided by the judgment "who fixes it when it breaks")
- ❌ Spelling out the file name on the calling side (`tsx scripts/<tool>/index.ts`). Call per directory (Enforcement: Prose — **mechanizable** (scanning the scripts of `package.json`, `.makefiles/`, `.lefthook.yaml` and workflows for the spelling `scripts/<tool>/index.ts` can reject it. No rule exists))

## Related ADRs

- [0002-formatter-linter.md](0002-formatter-linter.md) — what biome / ESLint inspect
- [0003-version-manager.md](0003-version-manager.md) — pins for the execution system (Node / `tsx`)
- [0027-directory-structure.md](0027-directory-structure.md) — the physical placement of `src/` and co-location
- [0090-testing-strategy.md](0090-testing-strategy.md) — one subject one test, the coverage gate, separation of suites
- [0153-ci-configuration.md](0153-ci-configuration.md) — the CI side that calls helper scripts
- [0157-inspection-declaration-discipline.md](0157-inspection-declaration-discipline.md) — fail-closed inspection and exclusion declarations

# Library Selection and Operations Policy

This project follows this ADR's policy for the **selection, version pinning, updating and auditing of npm libraries** added to `dependencies` / `devDependencies` in `package.json`.

Recommended stacks per category (UI / state / form / validation, etc.) are out of scope for this ADR and are decided case by case in a separate ADR or within a PR as needed. This ADR is limited to the **meta policy**.

## Status

Accepted

## Rationale / Purpose

- Fix the decision criteria so that adding or updating a library **is not argued from scratch every time**
- Let a later reader trace "what to check to make an adoption decision" and "how to maintain it"
- Write down a minimum of security / supply-chain controls

## Selection Criteria

A PR that adds a new library runs the following checks and records the results in the PR body. Judgment proceeds **primary (structural) → secondary (quantitative)**, and **anything that fails the primary judgment is not examined against the secondary**.

### Primary Judgment: Single Responsibility × Single Upstream

**Only a library that corresponds to "a replaceable responsibility that can be given one name" may be adopted.** This is a yes/no test derived from [0010](0010-standards-and-non-lockin.md) (who is doing the choosing), and it is applied before the quantitative checks.

- **Single responsibility**: what the library is responsible for can be said in one word. Anything that cannot (a bundle of multipurpose utilities, anything calling itself a "framework") is broken down into narrow libraries that carry only the needed responsibilities and reconsidered
- **Single upstream**: a library that **stands between** two independently versioned upstreams (bridge / instrumentation) structurally cannot satisfy this criterion. It goes through the **exception path** described below

**How upstreams are counted (this repository's reading)**: `react` / `next` are the **runtime foundation** and are not counted as upstreams. Bindings tied to React (`react-hook-form` / `zustand` / `@tabler/icons-react`, etc.) treat React as "chosen by a separate, already settled decision" ([0010](0010-standards-and-non-lockin.md)) and are **regarded as single upstream**. Without this reading nearly everything in the npm ecosystem would be an exception and the test would not work.

**Handling copy-in distribution**: a distribution form that copies source into your own repository (shadcn/ui, etc.) is not an npm dependency and is outside this judgment (= your own code). However, **the real dependencies it requires** (the underlying layer such as Radix) are in scope, and the full underlying set a copy-in requires is evaluated together as **one adoption decision**.

### Secondary Judgment: Required

| Aspect | Criterion |
| --- | --- |
| Maintenance status | **No unfixed known vulnerabilities** (`pnpm audit`). Release recency is not a criterion — it is normal for a library that has matured and needs no changes to stop releasing, and that in itself is not a reason to reject it. Only **a library with a vulnerability and no fix forthcoming** is regarded as archived and rejected. If the library's own releases have stopped, also check whether its dependencies in layers with an attack surface (parsers, etc.) are maintained |
| TypeScript support | First-party type definitions are bundled, or an official `@types/*` package exists and keeps up |
| Next.js / React version alignment | Supports this project's `next` / `react` major versions (held by `package.json`) |

### Secondary Judgment: Recommended (Input for the Adoption Decision)

| Aspect | How to check |
| --- | --- |
| **Upper bound on fork cost** | **The burden in the worst case of forking is known. Record it as "the order of magnitude of the library's implementation lines" × "the stability of the interface of the counterpart it depends on"** |
| Bundle size | Record the minified + gzipped size from <https://bundlephobia.com/> |
| ESM support | Check `type: "module"` or `exports` in `package.json` |
| Community size | Record npm weekly downloads / GitHub stars as reference indicators (not absolute indicators) |
| Number of dependencies | Check the extent of transitive dependencies with `pnpm why <pkg>`; if extremely many, compare with alternatives. Look at **the actual number of publishers rather than the count itself** (a swarm of micro-packages may be numerous yet have few trust points, while concentration on one publisher is itself a risk) |

**Why the upper bound on fork cost takes priority over "governance / ownership"**: "whether the maintainer is an individual, a company or a community" easily drifts into subjective judgment; even if owned by a single company, the real danger is small if the library is small. Conversely, even community-owned, the danger is large if it is huge and cannot be forked. Asking **whether the worst-case upper bound is known** is more deterministic, and ties directly to [0010](0010-standards-and-non-lockin.md)'s "were you able to choose among alternatives on independent grounds". Ownership is enough to record as input for estimating the fork cost; it is not a criterion in itself.

### Exception Path: Bridge / Instrumentation

**A library that stands between two independently versioned upstreams** structurally cannot satisfy the primary judgment. Substituting hand-written glue code couples tightly to the counterpart's internal lifecycle and actually increases the maintenance debt, so it is accepted as **an explicit exception, justified individually**.

A PR claiming the exception states the following three points in its body.

1. **The hand-written substitute is worse** — which internal lifecycle owning the glue yourself would couple you to
2. **Upper bound on fork cost** — the library itself is small (same as the table above)
3. **Limited drift surface** — how the releases of the two upstreams track each other, and that the interfaces that can actually break are limited to stable releases

**This repository distinguishes runtime from build time / development time.** A build-time or development-time bridge **does not ship in the production bundle and has a small blast radius**, so the threshold for the exception is treated as lower than at runtime.

| Category | Examples | Handling |
| --- | --- | --- |
| Runtime bridge | An editor core × its React binding, etc. | Made an exception with the three points above stated individually |
| Build-time / development-time bridge | Generators / bundler plugins / the catalog's framework integration | Accepted as an exception; stating the upper bound on fork cost alone is enough |

### Adoption Decision Template (Paste into the PR Body)

```markdown
## ライブラリ採用チェック

- 対象: <package-name>@<version>
- 用途: <なぜ必要か / 既存依存で代替不可な理由>
- 一次判定: 責務名 = <1 語で> / upstream = <単一 | 2 つ(例外パスへ)>
- 例外の場合: 手書き代替が不利な理由 / drift 面 / 追従関係
- fork コスト上限: 実装規模 <桁> / 依存 IF の安定性 <安定版 | 不安定>
- メンテナンス: 未修正の既知脆弱性 <無し | 有り: 内容> / 直近 release: yyyy-mm-dd（参考値）
- TS 対応: 1st-party / @types / なし
- Next.js / React 互換: 対応 / 未確認
- バンドルサイズ: minified+gzipped Xkb
- 所有形態: 個人 / 単一企業 / 財団・コミュニティ（fork コスト見積りの材料。単独の可否基準にしない）
- 代替検討: <他に比較した候補と、それを採用しなかった理由>
```

## Version Pinning Policy

**Principle: everything is exact-pinned. Ranges (`^` / `~`) are not used.**

| Category | Examples | Specifier | Reason |
| --- | --- | --- | --- |
| Runtime core | `next` / `react` / `react-dom` | exact (`x.y.z`) | Breaking changes have wide impact and need an explicit update decision |
| Main dev tools | `@biomejs/biome` / `typescript` | exact | Forbids drift in the formatter / type checker |
| Other dependencies / devDependencies | UI / utilities / `@types/*` / auxiliary tools | exact | See below |

**The reason ranges are not used is to keep a single entry point for updates.** The benefit of ranges is "making it lighter to take in patches", but in this repository Dependabot brings those in as PRs
([0110](0110-security-operations.md)). With ranges, such a PR would move only the lockfile without changing `package.json`, and **a version change would no longer show up in the `package.json` diff**. With exact pins,
a version change always appears as one line and can be traced from both review and `git log`.

**This distinction does not change "whether an update is allowed".** Every category goes through Dependabot's cooldown and
the [update and audit cycle](#update-and-audit-cycle) in the same way. The specifier only decides where the change
shows up.

The **lockfile** (`pnpm-lock.yaml`) is **always committed**. Editing it by hand is prohibited (inheriting the policy of ADR 0001).

**Rules for adding and updating:**

- Always add with `pnpm add -E <pkg>` / `pnpm add -D -E <pkg>`, and leave no `^` in `package.json`
- A major update is **always a separate PR**, and the PR body quotes the breaking changes from the CHANGELOG
- Minor / patch updates may be **combined into one PR** (see "Update and Audit Cycle" below)

## Update and Audit Cycle

Run the following periodically. As a guide, monthly for individual operation and weekly when automated on CI.

### Weekly to Monthly

- List update candidates with `pnpm outdated`
- Check security warnings with `pnpm audit`
- Combine minor / patch updates into one "library update PR", and merge after CI and manual verification
- **ESLint → Biome move decision**: for the ESLint complement (each rule in `eslint.config.ts`), check whether an `@biomejs/biome` update has made Biome support an equivalent check. Supported rules are removed from ESLint and moved to Biome ([0002](0002-formatter-linter.md)'s complementary use of ESLint = capability-based, shrinking direction). As input, refer to the "why Biome cannot express this" comment attached to each rule in `eslint.config.ts`

### Quarterly to Semiannually

- Take stock of major updates (extract the ones whose `Latest` column in `pnpm outdated` is one or more majors ahead)
- Handle each in a separate PR. If there are breaking changes, decide through an ADR (keep using it / switch to an alternative / reduce functionality)

### Responding to Security Warnings

- For `pnpm audit` findings at `high` or above, **start a response within 48 hours** (update / temporarily pin the dependency / switch to an alternative)
- If it cannot be handled immediately, open a GitHub issue and document the mitigation (affected paths / mitigations)

### Supporting Skills

- When using this repository's `.claude/skills/tools-upgrade/`, apply the same audit to tools obtained through mise.toml
- Updating an npm dependency named by a security warning is handled by `.claude/skills/dep-vuln-upgrade/`. It moves to the smallest fixed version within the same major (transitive dependencies through `overrides` in `pnpm-workspace.yaml`), and versions caught by the window are handed to `supply-chain-triage`. Switching to an alternative is adding a new dependency and goes through this ADR's adoption flow

## Adoption Flow

1. **Open a proposal PR**
   - Fill in the "Adoption Decision Template" and paste it into the PR body
   - Briefly describe the scope of impact (bundle / types / surrounding code)
2. **Review**
   - **Look at the primary judgment (single responsibility × single upstream) first. For anything that fails it, confirm the three points of the exception path are written; if not, send it back**
   - Confirm every required check is satisfied
   - Confirm there is no overlap with existing dependencies and no lighter alternative
3. **Merge**
   - Anything large-scale or affecting policy gets a separate ADR (e.g. adopting a state-management library, the API-client generation policy)

## Prohibitions

- ❌ Mixing a major upgrade into the same PR as other feature changes (Enforcement: the groups in `.github/dependabot.yml` split Dependabot's major updates into separate PRs. Whether a change sitting alongside a major raised by hand is a follow-up fix or a separate feature change is Prose — **not mechanizable**: it is a judgment about the intent of the change)
- ❌ Editing `pnpm-lock.yaml` by hand (consistent with ADR 0001) (Enforcement: the `lockfile-drift` job (`pnpm install --frozen-lockfile`) fails on hand edits that disagree with package.json. A hand edit that still satisfies the ranges in package.json is Prose — **not mechanizable**: it cannot be distinguished from lines pnpm resolved)
- ❌ Adding dependencies with `npm install` / `yarn add` and the like (pnpm only — consistent with ADR 0001) (Enforcement: the `lockfile-drift` job (`pnpm install --frozen-lockfile`) fails on dependencies added with npm / yarn that pnpm-lock.yaml has not followed. Committing package-lock.json / yarn.lock could be caught by spelling, but no rule exists)
- ❌ Leaving `pnpm audit` findings at `high` or above unaddressed (Enforcement: `make audit` (the `dependency-audit` job) fails on high-or-above findings that have a fixed version. Starting work on a high with no fixed version and recording the mitigation is Prose — **not mechanizable**: it is a response procedure and does not appear in code)
- ❌ Newly adopting a library that carries unfixed known vulnerabilities (an old release history is not itself a reason to reject) (Enforcement: the `dependency-review` job fails on known vulnerabilities at high or above in dependencies added by the diff. Below high is Prose — **mechanizable** (it could be caught with the same action's threshold. No rule exists))
- ❌ Deciding adoption on the quantitative checks alone without passing the primary judgment (single responsibility × single upstream) (Enforcement: Prose — **partly mechanizable**. Whether the body of a PR adding a dependency has the adoption template's `一次判定:` line could be caught by checking the body, but no rule exists. The soundness of the judgment itself is a judgment about responsibility and is not decided by the shape of the code)
- ❌ Adopting a bridge / instrumentation without stating the exception path (an implicit exception guts the primary judgment) (Enforcement: Prose — **not mechanizable**. Whether the library stands between two upstreams is a judgment about the dependency's role and is not decided by package.json)
- ❌ Adopting a multipurpose library whose responsibility cannot be named in one word "because it is convenient" (Enforcement: Prose — **not mechanizable**. Whether the responsibility can be named in one word is a judgment about the library's role and is not decided by the shape of the code)
- ❌ Keeping a list of adopted libraries in this ADR (a list is inventory, not a decision; see "Notes" below) (Enforcement: Prose — **not mechanizable**. Telling a package name used as an example from a list of adopted libraries is a judgment of context and is not decided by spelling)

## Notes

- Items where "absolute indicators" and "numeric borders" are deliberately avoided (community size, bundle size, etc.) are kept that way to keep the repository general-purpose. A real project may layer its own thresholds on top
- Whether to adopt an individual library is decided in the PR review that refers to this ADR. This ADR does not maintain lists such as "do not add X" or "Y is prohibited"
- **A list is inventory, not a decision** (the taxonomy of [0140](0140-documentation-operations.md)). The primary source for the currently adopted libraries is `package.json`; once decision inputs such as responsibility names, exception categories and the upper bound on fork cost need to be kept, `docs/reference/dependencies.md` is created to hold them separately. This ADR holds **only the policy**, not a list

## Related ADRs

- [0001-package-manager.md](0001-package-manager.md) — adopting pnpm / lockfile handling
- [0002-formatter-linter.md](0002-formatter-linter.md) — adopting Biome (an example dev tool) / exact pinning of the ESLint complement and the move decision
- [0003-version-manager.md](0003-version-manager.md) — pinning the versions of Node / pnpm themselves (mise.toml)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — the parent principle. The primary judgment (single responsibility × single upstream) and the upper bound on fork cost derive from its §2 on who is doing the choosing

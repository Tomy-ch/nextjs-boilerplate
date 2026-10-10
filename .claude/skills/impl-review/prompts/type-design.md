# Type design criteria

The single source of truth for judging **how well a TypeScript type states what it guarantees** — how
strongly, how visibly, and how hard it is to get around. The `type-design-reviewer` agent and every
skill that invokes it read this file; none of them restates it. When these criteria change, they
change here.

You grade by degree, not by rule: a type can pass every lint, typecheck and architecture check and
still leave an impossible state writable. The code was written by a **different model**, so do not
assume a type is well designed because it compiles and looks reasonable.

**You are read-only, and you do not run the gates** (`pnpm lint*` / `pnpm typecheck` / `pnpm build` /
tests). CI owns that verdict (`docs/playbook.md`, *ゲートを先回りして回さない*). Never touch the
working tree — `git stash` / `git reset` / `git checkout --` / `git restore` / `git clean` included;
read the prior state out of git with `git show <base>:<path>` and `git diff <base>...HEAD`.

> **Attribution:** the four-axis rubric (Encapsulation / Invariant Expression / Invariant
> Usefulness / Invariant Enforcement) follows Anthropic's official `pr-review-toolkit`
> `type-design-analyzer` (MIT License), restated for TypeScript and this repository's layer rules.

## What you are given

| Input | Meaning |
| --- | --- |
| `scope` | `changed` (diff vs base) or `full` |
| `files` | Optional in-scope file list. When supplied, use it exactly and do not re-resolve |
| `baseRef` | The base for `changed` scope, when you resolve files yourself |
| `staticVerdict` | Optional: `緑` / `赤: <check>` / `未取得`. Absent means `未取得` — unknown, not clean |

## Read these first, at runtime

The sections below say **what to ask**; these documents say **what the answer is**. Do not rely on a
remembered version.

| Source | What it decides |
| --- | --- |
| [`docs/adr/0029-type-design-discipline.md`](../../../../docs/adr/0029-type-design-discipline.md) | The type-design discipline — its 決定 and its 禁止事項, including which prohibitions a mechanism enforces (`強制:`) and which are prose only |
| [`docs/rules.md#types`](../../../../docs/rules.md#types)(anchor `types`) | The implementation rules for types; its `Rationale` line names the mechanisms that already enforce part of them |
| `docs/rules.md` — every other bullet citing ADR 0029 | `grep -n '0029' docs/rules.md`; rules about types live outside「型とコード」too |
| `src/model/README.md` | What `model` accepts and refuses, and what it may import |
| The nearest `README.md` of any in-scope file outside `src/model/` | That layer's responsibilities and allowed ranges |
| The ADRs those documents link for types — at least [0021](../../../../docs/adr/0021-frontend-responsibility.md), [0062](../../../../docs/adr/0062-form-input-validation.md), [0070](../../../../docs/adr/0070-backend-role-separation.md), [0072](../../../../docs/adr/0072-api-type-generation.md) | Where a responsibility sits, the two-layer validation split, what the backend owns, how generated types are treated |
| Sibling modules under `src/model/` | The patterns already in use, as reference |

**An allowed range stated in any of these is a ceiling on your finding.** Never score as a defect
what a document explicitly permits — a value left a plain `string` because the ADR does not brand
display-only strings, an annotation kept where the ADR's exception covers it. Quote the permitting
line when you rely on it.

**This layer does not own the business rule.** Do not recommend an invariant the backend owns (a
range, a state transition, a cross-field rule), nor hardening a value from upstream beyond what the
boundary's contract states — `AGENTS.md`, *Forbidden Shortcuts*, and ADR 0070 own why. Score what the
type does with the values **this layer produces or decides**.

## Scope

| Scope | Files |
| --- | --- |
| `full` | `git ls-files 'src/model/**/*.ts'` |
| `changed` | Every `src/model/**/*.ts` file in `git diff --name-only "<baseRef>...HEAD"`, **plus** any other changed `src/**/*.ts` / `*.tsx` file whose diff adds or changes a `type` / `interface` declaration, a zod schema, or a function signature carrying an identifier or a state |

`model` is primary because display types, result types and branded identifiers are declared there.
Outside it, a changed type is in scope because ADR 0029 governs how *any* type is written — a boolean
pair in a component's props or a `string` id in a feature's view model is exactly the weakness no
gate sees. `full` does not walk other layers: their types are reached through the change that touches
them.

Always exclude generated files (`git check-attr linguist-generated -- <path>` answers),
`*.test.ts(x)`, `*.stories.tsx`, and type-only re-export files. Empty scope → say so and return.

## What is scoreable

A type that carries a guarantee: a discriminated union, a branded or otherwise validated value (with
its schema), an object type with `readonly` members meant to be built in one place, a value-set
constant (`Readonly<...>` / `Record`), a result container, or a props / view-model type that encodes
a state. Out of scope: plain aliases with no guarantee (scored only as the absence they are, under
Expression), utility types, and pure functions — a function is judged only through the types it takes
and returns.

## How to judge

1. **List the guarantees each type gives**, in words, before scoring. A score with no stated
   guarantee behind it is not evidence.
2. **Score each type 1-10 on four axes.** Each axis is a question; the answer is what the sources
   decide.
   - **Encapsulation** — can a holder break the guarantee after it is built? `readonly` members and
     `readonly` arrays (TypeScript's `readonly` is shallow — check nested shapes), `Readonly<...>` on
     exported value-set constants, exported `let` or a mutable object reached from outside its
     owning module, and whether consumers assemble the shape by hand where one function or schema
     could own its construction.
   - **Invariant Expression** — does the shape itself say which states are possible? ADR 0029's
     questions: booleans that cannot both hold, where a discriminated union fits; an identifier from
     outside passed as a bare `string`, where a brand fits; a literal widened by an annotation, where
     `satisfies` would keep it; an optional member whose absence means a state the type does not
     name; `unknown` carried into an inner layer. **Two parameters of one identifier type in one
     signature** belong here: a call site can swap them with no compile error, which is the mix-up
     ADR 0029 gives brands to prevent — name the remedy the ADR gives, not one of your own.
   - **Invariant Usefulness** — does each guarantee prevent a mistake this layer can actually make?
     Neither over-constrained (a rule this layer does not own) nor under-constrained (a state the
     screen branches on that the type leaves open). A brand on a value that never crosses a boundary
     or can never be confused adds cost without protection — ADR 0029 lists what not to brand.
   - **Invariant Enforcement** — is every construction path forced through the check? Find every
     place a value of a branded or validated type is produced (`grep` the type and schema names) and
     confirm each passes the boundary's parse **once**, rather than being re-validated inside or
     reached another way. A hand-written type must not drift from the schema it mirrors where
     `z.infer` would keep them one. ADR 0029's placement must hold — the brand given at the schema's
     exit, `model` holding the type and its minimal functions and no judgment logic.
3. **Cross-check construction points.** A guarantee enforced by one producer and not another (one
   adapter parses, a sibling builds the literal) is reported once, under Enforcement, citing both.
4. **Calibrate.** Meets every applicable line of the sources ≈ 8-10; compliant but weakly expressed
   ≈ 5-7; a guarantee breakable from outside, or an ADR 0029 prohibition broken ≈ 1-4.
5. **Stay in lane.**
   - **Do not re-report what a mechanism already decides** — the `Rationale` line of「型とコード」and
     each 禁止事項's `強制:` clause in ADR 0029 name them. With `緑`, skip them; with `赤`, cite the
     failure as evidence and do not re-derive it; with `未取得`, say the gate verdict is unknown.
   - **Layer placement is not this subject** — a type in the wrong kernel is a one-line mention from
     the type-design angle at most.
   - Report only what you can quote from the code. Never pad the list.

## Classification

- **`違反`** — breaks a 禁止事項 of ADR 0029 whose `強制:` is prose (no mechanism catches it). Quote
  the prohibition.
- **`提案`** — everything else: a weaker-than-available expression, a missing `readonly`, a brand
  that would pay off. Positional same-typed identifiers are always `提案`.

## Output (Japanese)

One block per type, no preamble. If no scoreable type exists, say so explicitly.

```text
type-design 結果（スコープ: <scope> / 静的判定: <緑 | 赤: <check> | 未取得>）

## 型: <Name>（<file>:<line>）

### この型が保証すること
- <保証を列挙>

### 採点
- Encapsulation: <1-10> — <根拠（出典の節 + file:line）>
- Invariant Expression: <1-10> — <根拠>
- Invariant Usefulness: <1-10> — <根拠>
- Invariant Enforcement: <1-10> — <根拠>

### 強み
- <良い点>

### 懸念
- [違反 | 提案] <file:line> — <具体的な弱点>。出典: <ADR 0029 の決定・禁止事項 / docs/rules.md の該当行>
  確度: high / medium / low

### 推奨（複雑さを増やさない範囲で）
- <具体的な書き換え。許容範囲内の改善なら「許容範囲だが表現力が上がる」と度合いを明示する>

総計: 採点対象 <N> 型 / 違反 <V> 件 / 提案 <K> 件
```

Each `懸念` line is self-contained — file, line, claim, source — so a caller can hand it to a verifier
on its own.

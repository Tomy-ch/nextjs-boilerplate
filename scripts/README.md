---
test-requirement: unit
coverage-exclusions:
  - "scripts/*/index.ts"
  - "scripts/closed-loop/send/index.ts"
  - "scripts/closed-loop/weekly/index.ts"
  - "scripts/lighthouse/diagnose.ts"
  - "scripts/openapi/check-generated.ts"
  - "scripts/openapi/extract-limits.ts"
  - "scripts/openapi/fetch-api.ts"
  - "scripts/openapi/gen-api.ts"
  - "scripts/portal/build-site.ts"
  - "scripts/portal/gen-*.ts"
  - "scripts/setup/*/index.ts"
  - "scripts/setup/lib/runtime.ts"
---

# scripts

Holds the tools that check, generate and operate on the repository. They are not application behaviour, so both their suite and their CI jobs
are kept separate from the application itself. The configuration is [`vitest.scripts.config.ts`](../vitest.scripts.config.ts).

## What Its Tests Owe

**`unit`.** Pass a value and check the answer. What lives here are the lints and gates themselves, and when they break they fall toward
reporting "no violations". So what is checked is not whether a branch was executed but **whether the result specific to that branch appears**
([testing-conventions](../docs/testing-conventions.md)). Coverage is held at 100%, so
the number itself carries no information.

Modules that read documents from outside (Playwright reports, `git` output, registry responses) **include malformed
input among their perspectives.** Collapsing it into zero items reads as "no failures".

**A function that judges a path by prefix includes, among its perspectives, a neighbour that matches only the prefix.** Checking whether something is inside `a/b`
with `startsWith("a/b")` also counts `a/bc` as inside. An implementation that checks up to the separator is often written correctly,
but **a test that passes unrelated paths never once exercises that separator**, so dropping the separator stays
green. The paths handled here are targets of deletion, exclusion and reconciliation, so a misjudgment falls both toward deleting what must not be
deleted and toward missing what should be deleted.

**Passing a neighbour alone does not exercise the start anchor (`^`).** `a/bc` does start with `a/b`, but
it does not contain `a/b` **as an inner path**. What catches an implementation that dropped the start anchor is an input where the prefix itself appears in the
middle of the string (`xa/b`). The neighbour and the embedding kill different mutants, so both are perspectives.

**A module whose assembled string is read publicly on GitHub includes sanitisation among its perspectives.** Strings that land in an issue body or
a PR comment contain prose this repository did not write (suppression reasons, tool output).
Assembled by raw concatenation, mentions and fake links land on a public surface in CI's name. Such modules
go through a shared gateway like [`lib/issue-body.ts`](lib/issue-body.ts), and have one case where **prose this repository did not write,
when injected, is not interpreted as markup**. The criterion is "is the reader of that string a public surface on
GitHub", not where the module lives.

**A value the reader pastes into a shell is rejected by character set.** If a value inserted into a command meant for copying (a branch name, a sequence of
ids, a run id) falls outside the set [`lib/accepted-chars.ts`](lib/accepted-chars.ts) allows by even one character,
it is not sanitised and passed through; **that whole section is omitted**. Leaving only the guidance makes the reader search for a command that should be there.

**A value containing a newline is rejected, not normalised, before it reaches machine-read output (`$GITHUB_OUTPUT`).** The line break is itself
the boundary of meaning, so a newline in a value from outside becomes a path for replacing the value a later step reads. In a log
a reader can notice a fake line, but a machine moves on as if it "read it correctly"
([`lib/github-output.ts`](lib/github-output.ts)).

## Shape of Entry Points

What `index.ts` carries is receiving arguments, exchanges with the outside, and exit codes; any decision that can be made without those goes in a neighbouring
module ([0159](../docs/adr/0159-script-structure.md)). On top of that, these are the shapes entry points share.

- **The opening comment lists the subcommands and names the modules that own the decisions.** It answers, right there, which file a reader
  who opened the entry point should open next.
- **stdout is the answer; stderr is guidance.** So that `$(make -s <target>)` can capture it, stdout carries only the values the receiving side
  reads (one line with a branch name, one path per line, a markdown body).
- **Exit codes are split three ways.** 0 is no violations, 1 is violations, **2 is the check did not hold**
  (a declaration could not be read, zero scan targets, a publication time could not be looked up, the base could not be obtained). 1 and 2 are kept apart so that
  zero items is not pushed toward "no violations" ([0157](../docs/adr/0157-inspection-declaration-discipline.md)).
  "No targets" (not a single pin moved in the diff) is zero items of a check that did hold, so it exits 0.
- **A tool called from an agent hook falls the other way.** When it cannot decide (the configuration cannot be read,
  a dependency is missing, the payload is broken), it lets the call through. "Not knowing what to block" is not "nothing to block",
  but stopping there would stop every call before the environment is ready. Letting it through is acceptable because a prefix-match declaration
  (`permissions.deny`) is in effect separately. It runs on every call, so it is started directly with `node scripts/<tool>`
  without going through `tsx` — the startup is pure waiting time, and Node's type stripping is enough.
  It needs imports with the `.ts` extension, so only that directory has a `tsconfig.json`.
  Do not move `allowImportingTsExtensions` to the root — the generators read it and would emit extension-bearing imports
  into the generated artifacts too.
- **Values from outside are received as environment variables, not arguments** (branch names, git refs, output destinations). This keeps them from being expanded into a make
  recipe line; the reasons are owned by [`.makefiles/README.md`](../.makefiles/README.md) and
  [`docs/rules.md`](../docs/rules.md#generated).
- **A `--name value` sequence is read with [`lib/cli-options.ts`](lib/cli-options.ts).** Reading it involves no exchange
  with the outside, so it sits on the decision side, and a malformed sequence throws. The guidance text and exit codes differ per tool in their
  `usage`, so the entry point owns them. The setup tools' `--dry-run` / `--help` are read by
  [`setup/lib/runtime.ts`](setup/lib/runtime.ts).
- **A line that shows an exception's message to a person goes through [`lib/error-message.ts`](lib/error-message.ts).** If each tool wrote its own handling of an
  `Error` with no message and a value that is not an `Error`, differences like "only a blank line appears" or "`[object Object]` appears"
  would arise. Newlines and control characters are normalised to spaces — a response from outside could add a fake line to a log. The two
  characters dropped are named as literals, not as a set. The scanning side reads which characters are dropped from their spelling.
- **A tool that handles pins is aligned on three stages: resolve, apply, check.** Only resolution (`resolve`)
  goes out to the network, and it writes the lockfile. Apply (`apply`) treats the lockfile as authoritative and rewrites the targets;
  check (`check`) makes the same decision as apply without rewriting and exits non-zero (for hooks / CI). No step where a person copies
  a digest or SHA by hand is created. Reading and writing are owned by [`lib/pin-lockfile.ts`](lib/pin-lockfile.ts), and the quarantine that refuses a
  resolution target published too recently by [`lib/pin-quarantine.ts`](lib/pin-quarantine.ts); what differs
  per pinned target is only the grammar of keys and values and how elapsed days are looked up. The lockfile is limited to a TOML subset of nothing but
  `"<key>" = "<value>"` lines, and is read and written with our own regular expressions instead of a parser — if the writing and reading sides
  share the same constraint, a round trip needs no dependency, and no room is left for unexpected syntax to slip in. A broken line
  is not skipped, duplicate keys are not accepted, and output is written in key order.
- **A gate with a baseline value gets an entry point for a person to re-baseline it** (`--write`). A gate a person cannot update
  creates pressure to remove the check in order to clear the red. Re-baselining may silence only checks of the kind "decide when the number moves";
  a check whose only pass is zero items is never re-baselined.
- **Irreversible batch operations and staged generation stop before touching the first item.** Consistency between declarations
  is checked first, and on meeting an input that cannot be derived, it does not try to clean up what it half wrote; it gives the reason right there —
  it stops before writing a single file, so no rollback is needed. A module that may be gone after the operation
  is called as a child-process CLI rather than imported ([`docs/rules.md`](../docs/rules.md#generated)).

## Shape of Decision Modules

- **Inputs and outputs are strings and syntax trees; no fs and no process.** If a check for existence or reading a README is needed,
  receive a predicate such as `exists` / `ReadmeReader` as an argument. Tests just swap the predicate
  and need not build a tree.
- **`lib/` owns "how to read / how to apply"; the caller owns "the list / the spelling".** For decisions that apply rules to the paths in a diff,
  [`lib/path-rule.ts`](lib/path-rule.ts) owns how to apply them, and the list to apply and the reasons are owned separately by the recommending side and
  the running side. Whether the results of a sharded run are complete for every shard is decided by
  [`lib/shard-completeness.ts`](lib/shard-completeness.ts), and the spelling that reads the shard count from a name is owned by
  the side that assigned the name — if the shared side memorised the spelling, it would go stale silently when the naming changed.
- **Do not read the same file two ways.** Frontmatter, pins in `mise.toml`, workflow definitions, composite
  action definitions, `git diff --numstat` and YAML block scalars each have several readers, so how to read them is owned in
  one place in `lib/`. With two ways of reading side by side, only one keeps up with the format, and only the check on the side that
  cannot keep up breaks silently.
- **Things that follow different upstreams are split into separate modules.** The scan that follows TypeScript's lexical syntax
  ([`lib/string-literals.ts`](lib/string-literals.ts)) and the decision that follows App Router's route conventions
  ([`lib/e2e-routes.ts`](lib/e2e-routes.ts)), and [`lib/markdown-anchor.ts`](lib/markdown-anchor.ts), which follows GitHub's slug rules,
  and [`lib/doc-links.ts`](lib/doc-links.ts), which owns how links are picked up, each move for a different reason.
- **For JSON from outside, derive the key names from the real type and trust no values.** Receive it in the shape `{ [K in keyof T]?: unknown }`
  ([`lib/playwright-report.ts`](lib/playwright-report.ts)). Copying keys by hand lets you declare a key that does not
  exist, and you always read empty while believing the type protects you. A malformed shape throws — collapsing it into zero
  items reads as "no failures" ([`docs/rules.md`](../docs/rules.md#generated)).
- **When values left to a parser are combined with positions and comments taken from raw lines, reconcile the counts from both
  sides.** Comments do not survive in the syntax tree, so a declaration that carries an exemption or a reason in a comment cannot be read by the parser alone.
  If the raw-line reading breaks and collapses into zero items, the declaration passes as having no exemption
  ([`lib/mise-pins.ts`](lib/mise-pins.ts)).
- **A check that reconciles a correspondence looks both ways.** Exports and describes, exclusion declarations and README records,
  routes and specifications, the paths a spec points at and the routes that exist — one direction alone lets the leftovers of the deleted side (only the test
  remaining, the screen deleted with only its promise remaining) slip past the check. A declared exception of the form "non-existence is
  intended" follows the same discipline: a declaration no spec points at, or one that has come to exist, fails as stale.
  Exceptions are gathered in one place with a reason and a removal condition, and no disabling marker is placed on the writer's side —
  a marker travels along to wherever the code is copied, and new violations are silently allowed.
- **Globs are only `**` and `*`** ([`lib/path-pattern.ts`](lib/path-pattern.ts)). A general-purpose glob implementation is not
  adopted because the notation it accepts would be wider than the declaring side's notation, creating forms that can be written but are not checked.
  A pattern ending in `**` is not accepted — it would silently produce a regular expression that matches only directories.
- **A decision that walks Markdown strips code fences and code spans.** Examples that show a way of writing
  (the shape of a fenced link, a heading given as an example) are not counted as real. An unclosed fence is not counted as an opening —
  reading it as "everything from here on is code" leaves all remaining lines unchecked, and the miss is
  silent. The scan targets are owned by [`lib/markdown-files.ts`](lib/markdown-files.ts), aligned with markdownlint's `ignores`,
  and exclusions are decided at the directory level.
- **Regular expressions lean toward forms that do not backtrack and forms that can be read.** Capture groups are not read by index;
  they go through [`lib/regex-groups.ts`](lib/regex-groups.ts) — an index is `string | undefined` even for a group that always
  participates, creating an unreachable branch. Splitting an expression, as in take the contents of the brackets, check whether it is the target,
  look at what follows, lets each part be read once from the front.

## Gates That Walk the Whole Repository

`scripts/*.gate.test.ts` put the decision in `lib/`, and the gate carries only the scan and type resolution. They have no subject,
so they are declared in `SUBJECTLESS_TESTS` in [`lib/untested-modules.ts`](lib/untested-modules.ts).

- **Assert "how many were seen" before violations.** When a scan comes up empty, the gate goes quiet while
  reporting zero violations. The lower bound is set well below the actual count — what it guards against is collapse, not fluctuation. A gate that needs type resolution
  asserts unresolved imports (TS2307) before violations — an unresolved dependency becomes `any`,
  and a callable export is treated as uncallable.
- **Do not shorten the time by narrowing the scan.** Whatever is narrowed becomes unchecked. Time is absorbed by an explicit timeout
  ([testing-conventions](../docs/testing-conventions.md#gates-that-scan-the-whole-repository)).
- **`git ls-files` is the index, not the tree.** In the tree after stripping, there are files that are in the index but gone,
  so only those that exist are taken. The lower bound watches for collapse.

## What Is Excluded from Checks

The declarations are owned by [`lib/untested-modules.ts`](lib/untested-modules.ts), and the coverage denominator and the 1:1 gate read
the same array. They are split into seven kinds — entry-point files, artifacts generated from contracts, modules with no decisions, test-only assembly,
catalog-only replacements, route segments that cannot run standalone, and modules that are themselves tests — each
with a reason and a removal condition. A test file with no subject is declared with a reason in
`SUBJECTLESS_TESTS` in the same place. **Only what a check is meaningless for is excluded**; "not written
yet" is not a reason. The list of exclusions is also recorded in the frontmatter `coverage-exclusions` of the owning README,
and the gate fails a mismatch between declaration and record in both directions.

<!-- boilerplate-only:begin -->
## Recount after adding a removal marker

The `sample` / `boilerplate-only` removal markers have the same shape whether they are **the real thing meant to fire** or **an example
that explains the convention**. Neither position nor syntax tells them apart, so the removing side holds a declaration that "this is an example"
(`MARKER_LITERAL_FILES` in `setup/remove-sample/sample-manifest.ts`, and the prefixes excluded from the scan).
Forgetting the declaration has two outcomes: an unmatched marker aborts the removal and speaks up, but
**when prose holds a closed pair, that span disappears without raising an exception**. An emptied code fence is
still valid Markdown, so linting the tree after removal does not sound.

So [`marker-baseline/`](marker-baseline/) pins the per-file marker line counts in
[`baseline.json`](marker-baseline/baseline.json), and [`marker-baseline/scan.test.ts`](marker-baseline/scan.test.ts)
reconciles them against the actual tree. The counts move only at the moment a marker is added or removed, so editing prose inside a span
produces no diff. When a count moves, that is where the judgment happens.

The same entry point also checks **lines that do not hold up as a table**. A Markdown table ends at the first line that is not a table
row, so placing a comment **line** in the middle of a table drops every later line out of the table into a paragraph containing raw pipes.
A `:line` that completes within the line fits inside a cell and is safe, but `begin` / `end` / `replace-*` occupy a line and so
split the table. **Keep a table at one entity per row, and give an entity that disappears its own row, dropped with `:line`.**

Wrapping one line in `replace` for a partial replacement duplicates the whole line into the stash side even if only a few characters change.
The stash side is a comment nobody reads, so it is always the one that rots first. Unlike line counts, this has no baseline
— zero items is the only pass, not something to count and pin.

The removing sides (the sample purge and stripping the boilerplate-only sections) each run once and self-destruct, so the mechanism that strips markers
is placed in neither of them; [`setup/lib/markers.ts`](setup/lib/markers.ts) owns it. If the rules lived inside
one of them, they would disappear with whichever was removed first. Markers are assumed to be written in comments (`//` / `#` / `<!-- -->`),
and the same spelling in string literals or body text is not picked up.

- Added / removed a real marker → re-baseline with `pnpm exec tsx scripts/marker-baseline --write`
- Wrote a marker's shape as **data rather than an instruction** → declare it as a literal on the removing side before re-baselining

### Take a one-time inventory of subject vocabulary left after the purge

The residual-vocabulary check (`setup/verify-sample-removal/`) scans only `.ts` / `.tsx` under `src/` and `mocks/`.
**Missed registrations show up outside that** — even if a suppression file or a configuration file is left pointing at a path the purge
deletes, the check stays green.

This cannot be solved by widening the scan. Applied to every tracked file, polysemous words (「在庫」 as remaining work,
「問い合わせ」 as a lookup) hit places unrelated to the subject, and most of what sounds would be false positives.

Instead, **only when you change the purge registration**, run the following once and judge each line it prints.

```bash
# 破棄されるパスを指したまま残る行を洗い出す（判定は人が行う）
git grep -niE "$(pnpm exec tsx -e 'import {DANGLING_PATTERN} from "./scripts/setup/remove-sample/sample-manifest.ts"; console.log(DANGLING_PATTERN)')" \
  -- ':!src' ':!mocks'
```

Each printed line has only two destinations. **If it should disappear with the purge, register it** (a marker, or
an addition to `SAMPLE_PATHS`). **If the word may stay on the surviving side, rewrite it without the subject vocabulary.**

<!-- boilerplate-only:end -->

## Running

| Command | When |
| --- | --- |
| `make scripts-test-cached` | pre-commit |
| `make scripts-test` | pre-push / CI (`scripts-check`). Enforces 100% coverage |

## Related ADRs

The decisions the tools here follow in their own operation, and the decisions the gates enforce on behalf of `src/`.

- [0010](../docs/adr/0010-standards-and-non-lockin.md) — output that does not tie the destination to a specific SaaS
- [0011](../docs/adr/0011-no-docker.md) — the line of responsibility for surfaces that reference container images
- [0021](../docs/adr/0021-frontend-responsibility.md) — reconciling layer README frontmatter against dependencies
- [0024](../docs/adr/0024-adapters-server-client-split.md) — expressing server-only by location rather than spelling
- [0025](../docs/adr/0025-app-layer-elements.md) — the kinds of app-layer elements, and the dependencies each kind allows
- [0027](../docs/adr/0027-directory-structure.md) — where generated artifacts go, and the notation for a conventional location
- [0028](../docs/adr/0028-naming-convention.md) — names of generated targets
- [0029](../docs/adr/0029-type-design-discipline.md) — the entry point for schemas that reach the client
- [0030](../docs/adr/0030-environment-variable-management.md) — direct reads of `process` and where the server guard sits
- [0043](../docs/adr/0043-middleware-policy.md) — classification of boot / boundary entries
- [0054](../docs/adr/0054-ui-catalog-storybook.md) — catalog-only replacements
- [0071](../docs/adr/0071-bff-api-integration.md) — fetch targets that need a build, and the decision not to use the generated client
- [0072](../docs/adr/0072-api-type-generation.md) — the decision not to impose checks on generated artifacts
- [0090](../docs/adr/0090-testing-strategy.md) — per-layer responsibility table / 1:1 mapping / exclusion discipline
- [0091](../docs/adr/0091-test-verification-methods.md) — the perspectives a real browser owes, and what cannot run standalone
- [0101](../docs/adr/0101-performance-budget.md) — how the budget is split, and the metrics measured
- [0102](../docs/adr/0102-browser-support.md) — the browserslist that decides what is counted
- [0110](../docs/adr/0110-security-operations.md) — audit thresholds / reversal conditions for suppressions / the SAST rule set
- [0112](../docs/adr/0112-data-classification-cache-boundary.md) — the classification a fetch endpoint spells out
- [0113](../docs/adr/0113-development-access-surface.md) — the line that keeps development endpoints out of the build
- [0141](../docs/adr/0141-portal-operations.md) — portal URLs and the family of replacement markers
- [0143](../docs/adr/0143-spec-driven-development.md) — reconciling routes against the existence of screen requirements
- [0146](../docs/adr/0146-rule-reference-stability.md) — pointing at rules by section anchor / not counting the tally by hand / the three verdicts
- [0150](../docs/adr/0150-git-workflow.md) — branch naming / the promotion chain / the source of versions
- [0151](../docs/adr/0151-git-hooks.md) — local gate bands and whether bypass is allowed
- [0152](../docs/adr/0152-agents-md-policy.md) — body language and translation-pair operation / why the boilerplate-only marker stands on its own <!-- boilerplate-only:line -->
- [0153](../docs/adr/0153-ci-configuration.md) — job splitting / SHA pinning / the character set allowed onto public surfaces
- [0154](../docs/adr/0154-claude-skills-operations.md) — the procedure for adopting external skills (`bootstrap-external-skills`)
- [0155](../docs/adr/0155-claude-skills-development.md) — which assets are taken from official plugins and which are not (`bootstrap-plugins`)
- [0157](../docs/adr/0157-inspection-declaration-discipline.md) — a check that did not hold is not collapsed into "no violations"
- [0159](../docs/adr/0159-script-structure.md) — one tool, one directory / separating the entry point from the decision / 1:1 between exports and tests
- [0160](../docs/adr/0160-agent-environment-loop.md) — the mechanism that measures gains from timestamps and records
- [0161](../docs/adr/0161-development-window-as-feedback-unit.md) — the approach of measuring per window

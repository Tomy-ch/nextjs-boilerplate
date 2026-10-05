# Boilerplate-Only Conventions

**Statements that hold only while this repository is the upstream boilerplate** are gathered here, in this one file.
The premise fits in one sentence.

> This is a template. Readers copy it to create their own repository and overwrite what it ships with.

**Setup deletes this file entirely** ([setup-repository.md](setup-repository.md), step 4 /
`make setup-remove-boilerplate-only`). Nothing written here is a rule of a repository created from
the template.

## Why gather it here instead of scattering it across locations

Fencing each place where the premise holds, on the spot, means **what disappears is the fenced range, and what breaks is the sentences on either side of it**. Every time
someone touches the area around a marker, there is another chance to break a fence without noticing.

Gathering it into one file removes this failure shape altogether — **the documents that survive contain no premise in the first place**, so after the cut
there is nothing to fix. What sits on the surviving side is only the pointers, each a self-contained single line carrying
`boilerplate-only:line`. The whole line disappears, so the sentences before and after it are not touched.

The **general form** of each convention is held by the document that owns it — [`docs/adr/README.md`](../adr/README.md),
[`docs/rules.md`](../rules.md), each layer's `README.md`. What this file records is only **how far upstream deviates**
from that general form. Writing a deviation into a surviving document makes it a lie the moment a repository is made from the template.

## Marker Contract

`boilerplate-only` is the single namespace for "what stops holding the moment it is copied", and one stripping pass
(`make setup-remove-boilerplate-only`) resolves it.

| Marker | How it is placed | Effect |
| --- | --- | --- |
| `boilerplate-only:line` | An end-of-line comment on the target line | That line disappears |
| `boilerplate-only:begin` / `:end` | Standalone line comments enclosing a range | Both the range and the markers disappear |
| `boilerplate-only:replace-begin` / `:replace-with` / `:replace-end` | Standalone line comments enclosing two ranges | The first half disappears and the commented-out second half is activated |

Reach for `replace-*` only where removing the range would drop a heading or a rule along with it — places where the created repository
needs to be told **something else** rather than **nothing**. In Markdown, write it as
`<!-- = ... -->`; in code, as `// = ...` / `# = ...`.

It is **not interchangeable** with the `sample` family. They fire at different moments (`boilerplate-only` at setup,
`sample` at the sample purge), and choosing to do only one of them is a valid option.

**Stripping scans the repository.** It does not draw from a file list because markers could be written outside the list,
and that miss would be silent — the pass reports success and only the premise reaches the created repository.
What is excluded is fetched dependencies and generated artifacts, and the declaration is held by
[`scripts/setup/remove-boilerplate-only/manifest.ts`](../../scripts/setup/remove-boilerplate-only/manifest.ts).

## What to Recommend

What is set out here is a **recommendation**, not the scope you may change — that is decided by `AGENTS.md`'s `Instruction Priority`
and `AI Modification Scope`.

- **Compare against the snapshot a new repository receives**, not against the history that led to it —
  what reads as coherent to someone who has never seen this repository and will never read its git log.
- **Quality and consistency stand above the cost of reaching them.** A numbering that contradicts the order it itself teaches, a convention
  kept everywhere but here, a name that survives only because renaming is work — recommend fixing them. "It already shipped"
  carries almost no weight.
- **Attach the cost to a recommendation** — the files touched, what breaks and for whom, what must be rebuilt — so that a person can keep the direction
  while declining only the scope.
- **Only two things carry authority**: a de-facto standard (an RFC, a specification, a platform's own definition), and the shape this
  repository's architecture derives. A recommendation that cannot be stated as either is a preference dressed as a recommendation.
- **Do not bake a particular deployment's situation into the surviving side.** But this is subordinate to the rule above — a knob is justified
  only when the variation is genuinely situational **and** neither the standard nor the architecture has settled it.
  A knob placed where a standard has already decided is a departure from the standard, and must either carry the declaration
  [0010](../adr/0010-standards-and-non-lockin.md) requires or go.
- **The criterion is never "more abstraction / less abstraction"** — move toward the shape the standard or the architecture derives,
  and drop the situational label.

## Do not pre-run the gates

The general form is held by [`docs/playbook.md`](../playbook.md#do-not-pre-run-the-gates) — "Do not pre-run the gates". Upstream's deviation is
**only one of degree** — here several worktrees share one host, so the gates multiply rather than queue.
With a single working tree, pre-running is cheap and this deviation disappears.

## Recount after adding a removal marker

For the `sample` / `boilerplate-only` removal markers, **the real ones that are meant to fire** and **examples that illustrate
the convention** have the same shape. Neither position nor syntax tells them apart, so the removing side holds a declaration that "this is an example"
(`MARKER_LITERAL_FILES` in `setup/remove-sample/sample-manifest.ts`, and the prefixes excluded from the scan).
Forgetting the declaration has two outcomes: an unpaired marker makes the removal abort loudly, but
**when prose holds a closed pair, that range disappears without raising anything**. An emptied code fence
is still valid Markdown, so linting the post-removal tree does not catch it.

So [`scripts/marker-baseline/`](../../scripts/marker-baseline/) pins the number of marker lines per file in
[`baseline.json`](../../scripts/marker-baseline/baseline.json), and [`scan.test.ts`](../../scripts/marker-baseline/scan.test.ts)
reconciles it against the real tree. The numbers move only at the moment a marker is added or removed, so editing the prose inside a range
produces no diff. When a number moves, that is where the judgment happens.

The same entry point also checks **lines that do not form a valid table**. A Markdown table ends as soon as it meets a line that is not a table row,
so placing a comment **line** in the middle of a table drops the following rows out of the table into a paragraph containing raw pipes.
`:line`, which completes within the line, fits inside a cell and is safe, but `begin` / `end` / `replace-*` occupy a line and
split the table. **Make a table one entity per row, and give an entity that disappears its own row and drop it with `:line`.**

Enclosing one line with `replace` for a partial substitution copies the whole line to the stashed side even if only a few characters are meant to change.
The stashed side is a comment no one reads, so it is always the one that rots first. Unlike line counts, this has no baseline
value — zero is the only pass, and it is not something to count and pin.

- Added / removed a real marker → regenerate with `pnpm exec tsx scripts/marker-baseline --write`
- Wrote a marker's shape **as data, not as a directive** → declare it as a literal on the removing side before regenerating

## Do not base a decision on what this tree currently contains

**Do not make "not placing it because that screen / place of use does not exist here yet" the basis of a surviving document.** The contents belong to
the copying side, not upstream. Read where it lands, it becomes **a sentence that says "there is none" about something the reader
actually has**.

A surviving document may state only two things.

- **Whether something is bundled at all** — what it has and what it does not
- **The coordinates at the time of adoption** — what lands where when it is adopted

**Reversal conditions are the same.** What may be set as a trigger is a change outside the tree — a tool gained the capability, a standard
defined it, the role of a mechanism you own changed. "That screen does not exist yet" is a state, not a change of premise,
and the test in [0140](../adr/0140-documentation-operations.md) applies as is.

**Do not write the name of a point in time either.** `v1` is a name attached to an upstream phase, and the copying side has no such stage.

The general form is held by *What to Recommend* above — "Do not bake a particular deployment's situation into the surviving side". What this section adds
is one point: **the contents are part of that "situation" too**.

**This is a different rule from "do not place an empty interface alone".** That one is a convention about whether an implementation exists,
and it also holds on the copying side, so a surviving document holds it ([0053](../adr/0053-ui-component-interaction-seam.md)).
Only this one looks at the contents, and it means something only upstream.

Enforcement: the vocabulary 「この木の在庫を根拠にした除外」 (exclusion based on what this tree contains) in [`scripts/premise-lint`](../../scripts/premise-lint).
**Only the assertive form fails on spelling** — a sentence that says the same thing in other words passes, so that is
checked by question 1 of the purity pass (`.agents/purity-sweep/purity-sweep.prompt`).

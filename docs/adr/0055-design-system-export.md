# Exporting the Design System

This ADR defines the shape in which this project's design system (design tokens and the contents of `components`) is **handed to design tools outside the repository**. The target is design work done outside the repo, such as surveying and critiquing the whole design system, remaking part of it, or designing new screens on top of it. Work that changes components itself is not the target — that is ordinary implementation work against `src/components/`.

Export is split into two stages: **what to hand over** (the deliverables) and **where and how to hand it over** (delivery). The former is the same for every destination, whereas the latter differs in procedure and reach per destination. This ADR decides where to cut between these two stages, and whether what was exported comes back into the repo. This is the decision body for "dependence on design tools is one-way, repo → tool", which [0010](0010-standards-and-non-lockin.md) sets as a principle.

## Status

Accepted

## Rationale / Purpose

- **Have design work done on the real thing.** Tokens and the contents of components exist only in the repo, so the side designing outside ends up assembling something close by guesswork. Handing over the real thing keeps colors, spacing and component names from diverging from the repo
- **Keep destinations' proper names out of permanent documents.** Writing a particular design tool's procedures or API quirks in an ADR or script means rewriting permanent parts of the repo when that tool is swapped ([0010](0010-standards-and-non-lockin.md) non-lock-in)
- **Keep a single authority for the design system.** If there is a path for a copy sent outside to flow back into the repo, it becomes unclear which side holds the authority

## The deliverables are tool-independent; only delivery knows the vendor

The export script (`pnpm design:bundle`) **knows no destination**. It emits only three things that can be input to any destination.

| Deliverable | Contents | What it is input to |
| --- | --- | --- |
| `r/*.json` | shadcn registry items. Each component's source is inlined, with its title and purpose attached | Tools that can read a registry take it in as-is. Tools that cannot can still read it as source |
| `catalog.md` | The inventory of components: layer, heading, purpose, what the component **does not hold**, story names | The first sheet to hand over. The whole design system can be read in one file |
| `tokens.css` | The generated semantic tokens | Colors, spacing, typefaces. Tools with their own variable system read this |

The registry format is adopted to emit, in reverse, exactly the format used when taking components in ([0052](0052-ui-component-policy.md)). The inventory's purposes and responsibility boundaries are drawn from each component's README, and story names from the Storybook index. The README is the authority on component descriptions ([0052](0052-ui-component-policy.md)), and Storybook is the single list of what components exist ([0054](0054-ui-catalog-storybook.md)), so no separate description is written for the inventory. Tokens carry [0051](0051-styling-system.md)'s generated artifacts as-is.

**Everything that differs per destination is held by agent skills** ([0154](0154-claude-skills-operations.md)). An assistant that reads files is handed the bundle as-is; for a tool that can create design content only inside its editor, the bundle is handed as the authority to an agent that can operate that tool — which path to take, and its procedure, are on the skill's side. Skills sit where they can be swapped without touching permanent parts of the repo, and anything shaped like a vendor is confined there.

**Rejected: write destinations into the script.** Giving the script a branch such as `--target=<vendor>` makes the script grow every time a destination is added, and leaves that vendor's name in `scripts/` and `package.json`. Destination procedures change faster than scripts, while the shape of the export does not change. Do not put things that change at different speeds in the same place.

**Rejected: a dedicated export per destination.** Splitting into "a token format for this tool" and "a component list for that tool" adds an endpoint for drift for every copy. The deliverables are one set, and if conversion is needed it is done on the delivery side.

## Dependence runs one way, repo → design

**Do not write what a design tool generated back into the repo via the export path.** Not tokens, not component sources, not screenshots. A tool's output is **a proposal of how it should look**, and the repo is **what actually ships**. Implementing a proposal is ordinary implementation work in which a person reads it and decides what to take.

Placing a path that flows proposals in automatically makes the code start following the output of a tool nobody verifies, and that tool becomes the repository's upstream. At that point the authority has moved to the tool side, and [0010](0010-standards-and-non-lockin.md)'s "the authority for the design system is in the repo" breaks.

**Rejected: automatic intake (a design tool → token sync pipe).** Editing token values on the tool side and syncing them into `tokens/` looks convenient at first glance by moving the place of editing to the tool. But the SSOT of tokens is `tokens/primitives.json` and the per-family semantic definitions ([0051](0051-styling-system.md)), and the consistency of the generated artifacts is enforced by generating from there. Flowing in reverse from the tool would mean re-expressing that consistency in the tool's constraints, and things would silently break from the parts that cannot be expressed.

That [0051](0051-styling-system.md) places "the synchronization method with design tools is not settled here" out of its range does not contradict this decision on direction. The core has no reverse path. Laying one down is a separate judgment, and the core's export never presupposes it.

## The bundle is a generated artifact and is not tracked

The export destination is `tmp/design-bundle/`, under gitignore. **Do not commit the bundle.** The bundle is a copy of the design system; the moment it is committed, a second design system is born in the repo, and the copy is left behind every time a component changes. Produce it on the spot when needed.

To look up story names, the script reads Storybook's built index. If there is no index, the script stops and prompts a Storybook build. Story names are not emitted as empty when there is no index because the inventory would then present "components without stories" as if they existed.

## What the export cannot carry

The bundle contains **neither rendered HTML nor screenshots**. Stories are rendered by JavaScript, so producing either needs a headless browser, which the export script does not have. When a destination needs to **see** components rather than **read** them, do not act as though the bundle covered it; convey as-is that it was not carried. The means of seeing is held by the observation lane of [0156](0156-browser-observation-tooling.md).

## Prohibitions

- ❌ Writing a particular design tool's name, API or procedures into the export script (`scripts/design-bundle`) or `package.json` (anything shaped like a vendor goes to skills) (Enforcement: Prose — **partly mechanizable**. Names of known design tools could be rejected by a string scan of `scripts/design-bundle` and `package.json`, but no rule exists. Procedures and API quirks have no name and are not decided by shape)
- ❌ Writing a design tool's output (tokens / component sources / screenshots) back into the repo via the export path. If it is to be implemented, do it as ordinary implementation work in which a person reads and decides (Enforcement: none — a decision not to adopt. The export script has no path that writes back into the repo; adding a reverse sync shows up in the diff as added scripts and dependencies)
- ❌ Committing `tmp/design-bundle/`, or placing copies of the bundle in `src/` or `docs/` (Enforcement: `/tmp` in `.gitignore` keeps `tmp/design-bundle/` out of tracking (`git add -f` passes straight through). Placing copies in `src/` or `docs/` is Prose — **not mechanizable**. Whether something is a copy is decided by the origin of its contents, and since it can also bear the same name as a generated artifact, like `tokens.css`, it is not decided by shape)
- ❌ Writing additional component descriptions for the inventory (each component's README is the authority for purpose and responsibility boundaries; the Storybook index is the authority for story names) (Enforcement: Prose — **not mechanizable**. Whether an added sentence is a copy of the README or a new description is decided by the sentence's meaning)
- ❌ Reporting what is not in the bundle (rendered output) as though the destination received it (Enforcement: Prose — **not mechanizable**. Reports are agent output and do not appear in code)

## Related ADRs

- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — the direction of dependence (one-way, repo → tool) and the principle of not writing tool-specific procedures into permanent documents. This ADR is the decision body
- [0050-styling-strategy.md](0050-styling-strategy.md) / [0051-styling-system.md](0051-styling-system.md) — the frame and system of tokens. Where `tokens.css` comes from, and the positioning that the synchronization method is not defined there
- [0052-ui-component-policy.md](0052-ui-component-policy.md) — the shadcn registry format, and that the authority for component layers, placement and descriptions is in the README
- [0054-ui-catalog-storybook.md](0054-ui-catalog-storybook.md) — that Storybook is the single list of what components exist (where the inventory's story names come from)
- [0154-claude-skills-operations.md](0154-claude-skills-operations.md) — where the skills that hold per-destination delivery procedures live
- [0156-browser-observation-tooling.md](0156-browser-observation-tooling.md) — the means of "seeing" that the bundle cannot carry

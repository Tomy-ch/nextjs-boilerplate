# Tutorial

This directory holds **a step-by-step guide that assembles something that actually works, climbing the layers in order**. The rules ([`rules.md`](../rules.md)),
the decisions ([`adr/`](../adr/)) and the per-topic design explanations ([`design/`](../design/README.md)) hold "what is right",
but not "so how do I actually write it". This holds that one path.

## Why It Is Needed Here

The bundled sample in this repository is the first thing a repository created from the template purges. At that point the implementation examples
disappear entirely, leaving only the rules, the ADRs and the per-layer READMEs. **The documents here are read precisely after
the purge** — so they do not reference the code that disappears (the subject feature and the adapters, routes and specifications specific to it),
and they start from the state after the purge.

## Documents

| Document | What it builds | Layers it passes through |
| --- | --- | --- |
| [build-a-screen.md](build-a-screen.md) | One screen (list, detail, editing one item), from the contract through display, submission, tests and the catalog | `openapi/` → `model` → `adapters/server` → `features` → `app` → submission → tests → catalog → specification |

## How to Read This

- Each Step has **a purpose, the files it touches, real code, where to go at confusing branches, and verification commands**. The substance of
  a judgment is not copied; the document that owns the judgment (an ADR / a layer README / `design/`) is named. Copies rot
- The steps are ordered by dependency (contract → inner layers → outer layers). **The order of work when building a screen is different**, and is held by
  [`playbook.md`](../playbook.md#order-of-work-when-building-a-screen) "Order of Work When Building a Screen"
- The check commands listed are limited to ones that run only the files you wrote. The hooks and CI run the whole-repository gates
  ([0151](../adr/0151-git-hooks.md))

## Kept Elsewhere

| Location | What it holds |
| --- | --- |
| [`get-started/`](../get-started/) | The steps for **the one-time first** creation of a repository from the template. Not used afterwards |
| [`playbook.md`](../playbook.md) | A reverse lookup from what you want to do to where it goes, and the order of work when building a screen |
| [`design/`](../design/README.md) | Per-topic design explanations. Each explains one topic that crosses layers end to end |

The tutorial is **an end-to-end worked example**, not a reverse lookup or an explanation. If you find yourself wanting to explain the same topic in two places,
put the explanation in `design/` and only link to it from here.

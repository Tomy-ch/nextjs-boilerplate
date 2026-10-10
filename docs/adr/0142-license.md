# License Choice (MIT)

Sets out the basis for licensing this repository under **MIT**, the **OSS contribution policy**, and how the license relates to the `private` flag in `package.json`.

## Status

Accepted

## Context

Premise:

- This repository is **a presentation-layer boilerplate meant to be copied as a template** ([0011](0011-no-docker.md)); it is not something distributed and `install`ed as an npm package

## Decision

### 1. License = MIT

- This repository is licensed under **MIT** (`LICENSE`: Copyright (c) 2026 Tomy-ch). Basis:
  - **Maximum permissiveness**: it permits commercial use, modification, redistribution and sublicensing without restriction, which best fits the purpose of copying this repository for any use (including commercial)
  - **Ecosystem standard**: most of this repository's dependencies, starting with Next.js and React, are MIT / permissive, so there is no friction with the framework culture
  - **Low ceremony**: it brings in no CLA or copyleft obligations, minimizing barriers for template use
- Compared with Apache-2.0 (patent clause) or the BSD family as well, MIT's simplicity is preferred for this use, which needs no additional clauses

### 2. OSS contribution policy = inbound = outbound (no CLA)

- Contributions default to **inbound = outbound** (a submitted contribution is licensed under the same **MIT** terms as the work). **No separate CLA or copyright assignment is required**
- Contributors keep their copyright and provide their work to the repository under the MIT grant. The copyright notice in `LICENSE` (`Tomy-ch`) names the original author and does not deny contributors' copyright
- A DCO (Developer Certificate of Origin) sign-off is not made mandatory (if it becomes necessary, it is defined separately in `CONTRIBUTING.md` = a use-case-dependent strengthening of operations)

### 3. How `private: true` in `package.json` relates to MIT

- `package.json` has **`"private": true`**, which is **a guard against accidentally publishing to the npm registry**. This repository is not an npm distributable but something copied and used as a template, so publishing is deliberately disabled
- `private: true` (preventing npm publication) and MIT (permission to copy, modify and redistribute the source) are **concerns of different layers** and coexist. MIT grants the right to copy, modify and redistribute this repository's source; `private` only closes the distribution path as an npm package
- `package.json` carries **`"license": "MIT"`** so SPDX-compliant tools can read it. Stating it alongside `private: true` is not a contradiction (different layers, as above)

### 4. The license of the application itself

- **The license of an application built on this foundation is use-case dependent** (out of scope). MIT permits relicensing derivative works, so any license can be applied to your own project. However, under the MIT terms, **keeping the copyright and permission notices of the parts derived from the boilerplate** is required, which is handled the same way as for dependencies such as Next.js

## Prohibitions

- ❌ Introducing a CLA / copyright assignment as a mandatory condition for contributing (inbound = outbound is the default; any strengthening is agreed separately in `CONTRIBUTING.md`) (Enforcement: none — a decision not to adopt. No CLA or copyright-assignment mechanism is in place, and a change adding one shows up in the diff as added `CONTRIBUTING.md` content and operations)
- ❌ Interpreting `private: true` as "something that disables MIT" (the publish guard and the license grant are different layers) (Enforcement: Prose — **not mechanizable**. How the flag is interpreted is a matter of the reader's understanding and does not appear in code)
- ❌ Removing or altering the copyright notice or permission text in `LICENSE` without authorization (Protected Documentation. [0152](0152-agents-md-policy.md) / AGENTS.md)

## Related ADRs

- [0011-no-docker.md](0011-no-docker.md) — the presentation-layer role for template use (the background for choosing MIT)
- [0152-agents-md-policy.md](0152-agents-md-policy.md) / AGENTS.md — `LICENSE` is Protected Documentation (no direct edits)
- [0140-documentation-operations.md](0140-documentation-operations.md) — per-package README operations

# Code Search and Impact Analysis Tooling

This project defines the tooling agents use to **traverse the repository's structure as relationships**. The subjects are questions such as "how far does this change reach" and "who references this symbol"; questions answerable by string matching are owned by the existing grep.

graphify is adopted. It parses the repository locally with tree-sitter, maps it into a knowledge graph, and answers queries on top of it. In the same shape in which [0156](0156-browser-observation-tooling.md) set out observing the running application, this ADR sets out, for observing static structure, the scope of adoption, how it is obtained, how it is installed, and the handling of what leaves the machine.

## Status

Accepted

## Rationale / Purpose

- **Have a machine answer transitive change impact.** The direct readers of a changed module can be enumerated with grep, but going further from there is something a person can only repeat by hand. One tool that can traverse while holding relationships is needed
- **Fix one tool per question.** Assigning both grep and a relationship graph to "where does it reach" grows a different procedure per person. Questions that traverse relationships go to this lane, string questions to grep
- **Keep it optional.** Not installing it changes nothing in the build, lint or CI. Agent tools do not replace the gates' authority (the same line as [0156](0156-browser-observation-tooling.md))

## Scope of Adoption

What was confirmed to have value is **`affected`** (transitive change impact with relationships). Centered on it, the full set of query subcommands that complete locally is used.

**It is not adopted as a replacement for grep.** A reduction in context volume compared with a targeted grep did not reproduce in measurements. For small diffs grep is cheaper, and the relationship graph is queried only when the traversal exceeds 2 hops.

As properties of the tool, it is used with the following two in mind.

- **Queries truncate answers at a default budget.** The answer may lie on the truncated side, and the tool itself warns about it. It is unsuited to questions that need exhaustiveness; when exhaustiveness is needed, go back to grep
- **The graph is a snapshot from the last extraction.** Uncommitted changes are not reflected. Re-extract before judging

The output is not tracked in the repository. It is a derivative that moves with every code change, and it is also excluded from the scans of the Markdown lints (these lints do not read `.gitignore`).

## How tools are obtained

The path is split by what the artifact is (as [0156](0156-browser-observation-tooling.md) splits tool acquisition by artifact kind). graphify is a Python CLI, and `mise.toml` holds its pin as a standalone executable. Version quarantine follows [0110](0110-security-operations.md), and **as a tool that distributes agent skills, each bump is reviewed for "what it sends off the machine".**

**The distribution name and the CLI name differ.** Getting the package spelling wrong grabs a different (free-name) package, so procedures use the spelling in the pin as is.

## Limit installation to the single bootstrap path

Installation is allowed only through the bootstrap script the repository holds.

Depending on spelling, the tool's `install` family rewrites the repository's `CLAUDE.md` / `AGENTS.md` / other agents' configuration directories / git hooks. These are files AGENTS.md designates as protected, and **are not something that may be rewritten as a side effect of installation.**

**Splitting scope with `--platform` is not adopted.** The split "specifying a platform keeps it to user scope" does not hold — adding `--project` tips it into project scope, and some platforms write to the current directory even without a flag. Trying to guarantee the safe side through flag combinations would mean tracking, for every version of the tool, the boundary between spellings that may be allowed and spellings that must not.

Therefore,

- Only the arguments fixed by the bootstrap script (installation into user scope) are run. **The arguments are not moved from outside**
- In the agent's execution permissions, the `install` / `uninstall` family is put on **deny**, rejected without confirmation. This path alone is the exception, and it is not to be run from outside the script
- Where installation lands is verified by looking at the location resolved with the same precedence as the installer. Unless the order of resolution is aligned, installation succeeds while only the verification looks elsewhere and fails
- Re-running overwrites. **Idempotence by skipping on an installed marker is not adopted** — a successful installation rewrites the markers for every platform on disk at once, so matching markers do not prove the skill itself was updated

Removal is run by a person directly on their own machine. Since it is on deny, an agent cannot run it. To revert including the repository-side configuration, reverting the commit that installed it is enough.

The target is Claude Code only. This repository has no container for other assistants and cannot verify where installation lands. Platforms are added once such a container is prepared.

## Operations that call an external LLM API fall to per-call confirmation

The tool's default completes locally and needs no API key. On the other hand, semantic extraction from documents, PDFs and images, the deep analysis mode, wiki generation and community naming call an external language model.

**Only the subcommands that complete locally are put on the allow list of execution permissions; operations that call an external LLM go through per-call confirmation as opt-in.** Putting everything on allow is not adopted — every call incurs charges to an external model, and code content leaves the repository. Neither is something an agent may choose silently, and execution permissions exist as the place to insert confirmation (the same judgment as [0156](0156-browser-observation-tooling.md) stopping outbound sending by default).

## Rejected Alternatives

| Option | Reason |
| --- | --- |
| **Adopting it wholesale as a replacement for grep** | The reduction in context volume did not reproduce. Only transitive impact analysis with relationships has value |
| **Splitting scope with `--platform`** | See "Limit installation to the single bootstrap path" above. Flags cannot guarantee the safe side |
| **Putting operations that call an external LLM on allow too** | It would have the agent silently choose charges and code leaving the repository |
| **Skipping on an installed marker** | Matching markers do not prove the skill was updated |
| **Tracking the output in the repository** | It is a derivative that moves with every code change, and would only be diff noise |

## Prohibitions

- ❌ Running the `install` / `uninstall` family from outside the bootstrap script. Agents are blocked by deny, and people too install only through bootstrap
- ❌ Putting operations that call an external LLM API on permissions that let them run without confirmation (Enforcement: Prose — **partly mechanizable**. Whether the spellings of known subcommands that call an external LLM are on the `allow` of `.claude/settings.json` can be checked in a test, but no rule exists. Which subcommands call an external LLM changes with the tool's version)
- ❌ Using the graph's answer as grounds for exhaustiveness. Questions that need exhaustiveness are cross-checked with grep (Enforcement: Prose — **not mechanizable**. Whether the graph's answer was taken as grounds for exhaustiveness appears only inside the agent's reasoning)
- ❌ Tracking the output directory in the repository, or including it in lint scans (Enforcement: Prose — **mechanizable** (check in a gate test that `git ls-files graphify-out` is empty and that `graphify-out` is in each scan's exclusion list. No rule exists))
- ❌ Connecting this tool to any CI, git hook or build gate. The gates' authority lies in the existing checks (Enforcement: Prose — **mechanizable** (scan that no calls to `graphify` appear in `.github/workflows/**`, `.lefthook.yaml` or the scripts of `package.json`. No rule exists))

## Related ADRs

- [0003-version-manager.md](0003-version-manager.md) — `mise.toml` holding the pins of standalone executables
- [0110-security-operations.md](0110-security-operations.md) — cooldown, and vetting tools for agents
- [0154-claude-skills-operations.md](0154-claude-skills-operations.md) — agent tooling (operations)
- [0155-claude-skills-development.md](0155-claude-skills-development.md) — agent tooling (development)
- [0156-browser-observation-tooling.md](0156-browser-observation-tooling.md) — tooling of the same shape (observing the running application). It is authoritative for how tools are obtained and how sending is handled

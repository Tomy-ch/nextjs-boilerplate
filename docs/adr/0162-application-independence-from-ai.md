# The Application Does Not Depend on AI

The application this repository distributes — runtime, build, tests and the ordinary CI checks — **holds with not a single AI agent present**. Dependence on AI is confined to the development flow. Where [0160](0160-agent-environment-loop.md) treats the agent environment as something to improve, this ADR draws the line of **how far that environment may not reach**.

## Status

Accepted

## Rationale / Purpose

- **Those it is distributed to do not necessarily have the same tooling.** Whether they use Claude Code is unknown, and there is no agent on a CI runner. Resting the application's viability on that would hand users without the tools a repository they cannot build
- **Tools get replaced.** Models and CLIs are replaced on a scale of years. A shape where the application stops on every replacement makes the choice of tools irreversible (the no-lock-in test of [0010](0010-standards-and-non-lockin.md))
- **With the dependency pointing the wrong way, inspections cannot inspect themselves.** If a gate needs an agent to hold, an agent malfunction and a code defect come back as the same red. There is no longer a way to separate which is the cause

## Decision 1: No agent among the conditions for holding

Each of the following must pass in an environment with no agent.

- **Runtime** — the output of `pnpm build` works
- **Build** — `pnpm build` / generation (`make gen-api`, etc.)
- **Tests** — `pnpm test` and everything called from it
- **Ordinary CI checks** — jobs registered as required checks

**Even a checkout with no `.claude/` at all passes everything above.** The side that inspects agent assets (`skill-lint`, etc.) passes with 0 items when there is no target, and does not fail.

## Decision 2: Dependence on AI is confined to the development flow

What it may be confined to is **what does not appear in the deliverable**.

| May depend on | Must not depend on |
| --- | --- |
| Skills, agent definitions and permissions in `.claude/` | The application's execution path |
| Quiet runs via `make ai-<target>` | The verdicts of gates themselves |
| Review, investigation, ways of tracing code | The procedure for producing generated artifacts |
| Tools that change only context volume (`rtk` / `graphify`) | Required checks holding |

**The judgment is the single question "does behavior change in a checkout without that tool".** If it does, it is part of the application, not the development flow.

## Decision 3: Do not adopt tools that put themselves on the path

A tool that inserts itself into the path of `pnpm build` / `pnpm test` / required checks is not adopted, however much it helps while writing code. **Adoption is judged by the direction of dependency, not convenience.**

- Quiet runs (`make ai-<target>`) only wrap `make <target>` and do not change the wrapped side's verdict
- `rtk` only compresses output before it reaches the context, and calls none of the build / test / CI paths
- `graphify` is local analysis, and `graphify-out/` is untracked and read by no check

## Rejected Alternatives

| Option | Reason |
| --- | --- |
| **Calling an agent for generation** | Generated artifacts must be derivable deterministically from source (the drift gate of [0072](0072-api-type-generation.md) would stop holding) |
| **Using a model for gate verdicts** | An inspection that gives different answers for the same input cannot separate the cause of a red. The machine's job ends at producing findings ([0160](0160-agent-environment-loop.md)) |
| **Inspections that presuppose agent assets exist** | They go red in a checkout without the assets. An inspection passes with 0 items when there is no target |

## Prohibitions

- ❌ Inserting agent-oriented tools into the path of `pnpm build` / `pnpm test` / required checks (Enforcement: Prose — **partly mechanizable**. Whether spellings such as `rtk` / `graphify` / `claude` appear in the scripts of `package.json` and in the workflows of required jobs can be rejected by a scan, but no rule exists. Whether an unnamed tool is agent-oriented is decided by the tool's nature)
- ❌ Calling a model for producing generated artifacts or for gate verdicts (Enforcement: CI's harden-runner (`egress-policy: block`, allowed destinations in `.github/egress.yaml`, agreement checked by `make egress-check`) blocks traffic to model APIs from gate and generation jobs. Verdicts that run only locally, and changes adding a model API to the allowed destinations, are Prose — **not mechanizable**. Whether a destination is a model API is decided by the meaning of the value)
- ❌ Writing an inspection that presupposes `.claude/` exists and fails in a checkout without it (Enforcement: Prose — **mechanizable** (placing a job that runs the required checks in a checkout with `.claude/` deleted would reject it. No rule exists))
- ❌ Deciding whether to adopt a tool by convenience rather than by the direction of dependency (Enforcement: Prose — **not mechanizable**. What the adoption was decided by is the reason for a judgment and does not appear in code)

## Related ADRs

- [0160-agent-environment-loop.md](0160-agent-environment-loop.md) — the improvement loop for the agent environment. This ADR draws the line that environment may not cross
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — the no-lock-in test (that replacing tools is reversible)
- [0072-api-type-generation.md](0072-api-type-generation.md) — generated artifacts derivable deterministically from source
- [0153-ci-configuration.md](0153-ci-configuration.md) — the configuration of required checks
- [0156-browser-observation-tooling.md](0156-browser-observation-tooling.md) / [0158-code-search-tooling.md](0158-code-search-tooling.md) — tools for observation and search. Both are placed outside the gates

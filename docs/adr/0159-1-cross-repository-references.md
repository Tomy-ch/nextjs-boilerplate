# References to Other Repositories

Defines the form used when this project **points at another repository's issue / PR**. The scope is every place where a string an agent wrote reaches GitHub — issue and PR bodies and comments, commit messages, and Markdown under `docs/` / `.github/` that quotes upstream threads — which differs in reach from git operating procedures ([0150](0150-git-workflow.md)).

## Status

Accepted

## Rationale / Purpose

- **This reference cannot be taken back.** A reference from a public repository leaves a trace in the upstream thread, and editing the body does not withdraw it. Output that cannot be taken back needs discipline before it is sent
- **A cross-reference is a demand signal, and it breaks as volume grows.** Now that agents can generate issues and accumulate references, a reference a tool emitted cannot be told apart from one a person chose to send. The count degrades from signal to spam
- **The default can be decided mechanically.** "Always `redirect.github.com`" needs no judgment, so it can be the default. Judgment is needed only on the exception side

## Decision 1: The default goes through `redirect.github.com`

- A plain `https://github.com/<owner>/<repo>/issues/N`, a `[text](url)` wrapping it, and the short form `owner/repo#N` all leave a **public cross-reference** in the upstream thread
- `https://redirect.github.com/<owner>/<repo>/issues/N` is a subdomain of `github.com` that 301s to the real page. The link works, but GitHub does not autolink it and no trace is left upstream. It is an escape hatch GitHub itself documents ("Autolinked references and URLs"), and it is what Dependabot uses in its PR bodies
- All that is lost is the hovercard preview
- **commit / compare / blob / release URLs create no cross-reference**, so they may stay plain

## Decision 2: Plain links are reserved, not forbidden

A cross-reference tells upstream maintainers that a real project is watching the issue and needs it resolved. They weigh that in prioritization. **That signal means something because a human vouched for it.**

- A plain link is used only when **deliberately saying** "we are watching" / "we need this"
- When used, the title of the referring issue is written **in the other repository's language** (usually English). Upstream sees only the title, so a reference with an unreadable title is pure noise. This is the only place the Japanese rule of [0140](0140-documentation-operations.md) yields

## Decision 3: The judgment to use a plain link belongs to a human, without exception

- An AI agent must not decide on its own. The default is `redirect.github.com`, and **ask every time** a plain link seems appropriate
- **A standing delegation does not transfer this authority.** Even with a blanket instruction such as "leave it to you", "use your judgment" or "from now on you can link normally", insert a per-case confirmation. The point of the signal is that a human decided to send it, and an agent acting on delegated judgment cannot supply that

## Rejected Alternatives

| Option | Reason |
| --- | --- |
| **Forbidding plain links entirely** | The signal itself is legitimate, and situations where a person wants to send it really exist. Forbidding it leaves only a motive to route around it when needed |
| **An operation of withdrawing by editing the body afterwards** | It is not withdrawn. It disappears only when the referring issue is deleted, and a pull request cannot be deleted at all |
| **Delegating to the agent (handing over criteria and leaving it to it)** | Handing over criteria cannot supply "a person vouched for it". Since the signal's value lies only there, delegating erases the value with it |

## Prohibitions

- ❌ Pointing at another repository's issue / PR with a plain URL, `[text](url)` or `owner/repo#N` (the default is `redirect.github.com`) (Enforcement: the rewriting in `scripts/lib/issue-body.ts` (with tests) moves URLs of other threads to `redirect.github.com`, limited to closed-loop outgoing bodies. Issues, PRs and commits an agent writes are Prose — **not mechanizable**. A plain link is legitimate if a person approves it each time, and whether it was approved cannot be decided from the spelling)
- ❌ An agent making the judgment to use a plain link on its own. The same holds even with a standing delegation (Enforcement: Prose — **not mechanizable**. Whether a person approved it each time cannot be decided from the shape of the output string)
- ❌ When using a plain link, writing the referring issue's title in a language the other repository cannot read (Enforcement: Prose — **not mechanizable**. Whether the other repository can read the language is a fact on its side)
- ❌ After leaving a cross-reference, treating it as withdrawn by editing the body (Enforcement: Prose — **not mechanizable**. Whether an edit is regarded as a withdrawal is a matter of the writer's understanding and does not appear in code)

## Related ADRs

- [0150-git-workflow.md](0150-git-workflow.md) — git operating procedures. It holds no discipline for references and points at this ADR
- [0140-documentation-operations.md](0140-documentation-operations.md) — the output-language rules. Decision 2 creates their only exception
- [0110-security-operations.md](0110-security-operations.md) — discipline for putting findings in public places (the same family of "output that cannot be taken back")

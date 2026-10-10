# Security Policy

## Reporting a Vulnerability

**Do not report in a public issue.** Anyone can read an issue, so the report itself becomes the
disclosure of an unfixed vulnerability.

Report through GitHub's **Private Vulnerability Reporting**. From the repository's
**Security** tab → **Report a vulnerability**, you can send it in a form only the maintainers can read.

<!-- boilerplate-only:replace-begin -->
If that feature is disabled, contact the repository owner directly.
<!-- boilerplate-only:replace-with -->
<!-- = Contact: <security@example.com> (replace this) -->
<!-- boilerplate-only:replace-end -->

What to include in the report:

- The affected version, or commit
- Steps to reproduce (attach minimal reproduction code if you have it)
- The expected impact (what can be read / what can be written / what can be stopped)

## Response Process

| Stage | Target |
| --- | --- |
| Acknowledgement of receipt | Within 3 business days |
| Initial assessment (scope of impact and severity) | Within 7 business days |
| Release of a fixed version | Adjusted according to the assessment, with updates to the reporter as it progresses |

Work on anything `high` or above starts within 48 hours ([ADR 0004](docs/adr/0004-library-management.md)).

## Supported Versions

| Version | Supported |
| --- | --- |
| Latest release | ✅ |
| Earlier | ❌ |

This is a **template repository** and has no distributed artifacts. Rewrite the table above to fit
your own operations.

## Checks this repository runs on itself

The defense-in-depth setup is owned by [ADR 0110](docs/adr/0110-security-operations.md).

| Layer | Means | Where it runs |
| --- | --- | --- |
| Leaked secrets | gitleaks | pre-push hook and CI (PRs: the diff; weekly: the whole history) |
| Dependency vulnerabilities | Trivy fs / `pnpm audit` / OSV | CI. Reported on PRs; blocks PRs targeting protected branches |
| **Dependencies this PR added** | Dependency Review | CI (looks only at the PR's diff) |
| Code we wrote | Opengrep | CI. A tool that can be taken outside GitHub, so the layer remains in any environment |
| Code we wrote | CodeQL | CI. A layer that runs only inside GitHub |
| Points where values leave | Bearer | CI (findings go to code scanning) |
| Language-agnostic string checks | DevSkim | CI (findings go to code scanning) |
| Workflow definitions | zizmor / actionlint | pre-commit hook and CI |
| The repository's own settings | OpenSSF Scorecard | CI (push to the default branch, and weekly) |
| **Responses being served** | OWASP ZAP (baseline) | CI. The only dynamic check: it starts the app and attacks it |
| Dependency updates | Dependabot + cooldown | Weekly |

**Not everything is a gate.** Only layers whose baseline can be kept at zero and layers that ask "did this change add it"
go red; the rest only show findings. Once red becomes the normal state, the habit of stopping at red breaks first.

**When a detection is accepted, write the reason and the reversal condition in the suppression file.** No blanket disabling
([ADR 0110](docs/adr/0110-security-operations.md)).

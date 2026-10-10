# Versioning Policy

The project adopts **Semantic Versioning**. The version is named by the release branch name `release/v<X.Y.Z>`,
and tags are placed on the `production` HEAD ([0150](../adr/0150-git-workflow.md)).

## What the Version Refers To

The version is attached to **the template itself**. A repository created from the template copies the tree as of creation
and carries its own version. Generation copies only the tree; branch protection and token permissions are not replicated —
they are handed over not as settings but as "the procedure that applies the settings" (`make setup-repo`)
([0010](../adr/0010-standards-and-non-lockin.md)).

No mechanism is bundled for the creating side to take in later versions of the template. The arrow runs one way, template → creating side,
and keeping up afterwards is the creating side's decision.

## The v1.0.0 Boundary

Below v1.0.0 is the period in which the template's own design is settling. The following switch at v1.0.0
([0140](../adr/0140-documentation-operations.md)). This section is removed when it is reached.

| | Below v1.0.0 | From v1.0.0 |
| --- | --- | --- |
| ADR | living document. The body is overwritten, and no revision history is kept | immutable. Only the Status line is edited, and changes supersede with a new ADR |
| Editing protected documents | Per-change approval temporarily lifted | `AGENTS.md` / ADR bodies / `LICENSE` require approval |

## Release Branch Strategy

A release-centric branch model is adopted ([0150](../adr/0150-git-workflow.md)).

- Feature development branches from **the latest `release/*`**, and the PR's base is the same branch. GitHub's default
  branch is repointed to the latest `release/v<X.Y.Z>`
- Changes reach `develop` / `staging` / `production` only via `release/*`. Direct pushes to protected branches,
  force pushes and history rewriting are forbidden
- Only the integration PR `release/*` → `develop` may take `develop` as its base

## Release Procedure

1. From `production`, cut `release/v<X.Y.Z>` with `make branch-patch` / `branch-minor` / `branch-major`.
   `package.json`'s `version` is stamped from the branch name at this point, and CI (`package-version`) checks
   that they match
2. Promote `release/*` → `develop` → `staging` → `production` in separate PRs
3. Place the release notes at `.github/release/v<X.Y.Z>.md`
4. On the `production` HEAD, run `make tag-patch` / `tag-minor` / `tag-major`. It computes the next
   version from the latest tag, places the tag, and creates a GitHub Release with the release notes as its body. **It fails if there are no notes**

### Hotfix

- Cut from `production`. Using `make hotfix-patch` gives `hotfix/v<X.Y.Z>`, and the `version`
  stamping is aligned with release branches as well
- Open a `hotfix/*` → `production` PR, and after merging, bring the same fix into `develop` (and `staging` if needed)

## Principles

- Do not decide `package.json`'s `version` by hand. The branch name decides the version, and `package.json`
  follows it (to fix it by hand, `make version-stamp`)
- Place tags through make. The checks reach only as far as "the branch name and `package.json` match"; the correctness of the branch name
  itself is guaranteed only at the moment `make branch-*` cuts it
- Major dependency updates go into a separate PR that cites the breaking changes ([0004](../adr/0004-library-management.md))

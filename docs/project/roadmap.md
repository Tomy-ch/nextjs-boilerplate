# Roadmap

<!-- boilerplate-only:replace-begin -->
This page records the **direction** in which this project is maintained. It is not a schedule but a standing policy that shapes what is
accepted. Individual work items live in the issue tracker, where they can be closed. Listing them here
would be duplicate management that goes stale the moment one lands.
<!-- boilerplate-only:replace-with -->
<!-- = This page records the **direction** in which this project is maintained. It is not a schedule but a standing policy that shapes -->
<!-- = what is accepted. Put individual work items in the issue tracker, -->
<!-- = where they can be closed. -->
<!-- = -->
<!-- = Replace the sections below with your own project's direction. What is inherited from the template is the shape of the page, -->
<!-- = not its contents. -->
<!-- boilerplate-only:replace-end -->

Nothing written here is a promise with a date. What the maintainer takes on and does not take on is in
[policy.md](policy.md), which is deliberately narrower than the word "roadmap" implies.

<!-- boilerplate-only:begin -->
## What Each Release Line Is About

A release line is not a bundle of features but a **theme**. It is the unit that advances one question the template is trying to answer until
the answer is in; per-release detail is not copied here but kept in the release notes under `.github/release/`.

### v1 — A general Next.js application foundation on which the front end can be built without thinking

The line that bundles general-purpose, everyday libraries into the presentation layer and fully settles placement, how to write, and connection points
(the three pillars of [0011](../adr/0011-no-docker.md)). Layer boundaries are guarded by machines, the usage and responsibilities of components are answered by layer READMEs,
and the promises of screens by specifications.

v1.0.0 is also the boundary for documentation operations. ADRs switch from living documents to immutable
([0140](../adr/0140-documentation-operations.md)). Reconciling routes with specifications
is also completed at this point ([0143](../adr/0143-spec-driven-development.md)).

### v2 — Adopting what depends on the use case locally, on top of seams

Adopting i18n and PWA in the app is placed in v2 ([0121](../adr/0121-i18n-strategy.md) / [0130](../adr/0130-pwa-strategy.md)).
Local libraries such as payments, analytics and DnD are on the same line; until then the app holds only the coordinates for adoption.
Even once adopted, the seam remains and the library sits behind it ([0010](../adr/0010-standards-and-non-lockin.md)).

<!-- boilerplate-only:end -->
## Standing Direction

**Runtimes and dependencies are followed by explicit update decisions.** Every dependency, including `next` / `react`, is an exact pin,
and major updates come in only through a separate PR that cites the breaking changes ([0004](../adr/0004-library-management.md)).
Freshly published versions are not taken, because of the cooldown. An update with a known date may look held up, but that is not stagnation;
it is the policy at work.

**Supply-chain controls only move toward deepening.** Update quarantine, SHA pins for Actions and digest pinning of auxiliary images
are treated as the floor ([0110](../adr/0110-security-operations.md) / [0153](../adr/0153-ci-configuration.md) /
[0011](../adr/0011-no-docker.md)). A change that removes one is argued against the threat, not against inconvenience.

**Conventions that can be judged mechanically are moved into tools step by step.** Conventions kept by review are preferably moved into lint, boundary checks and
drift checks on generated artifacts. Then a convention applies identically to contributors and agents, and review can be spent
only on judgments that cannot be automated ([0144](../adr/0144-decision-enforcement-pairing.md)).

**Deliberate non-adoptions stay non-adopted.** [out-of-scope.md](out-of-scope.md) is not a backlog.
An item leaves it only when the recorded reason no longer holds, and that is an ADR decision. A state —
a request came in, votes went up, upstream has it — is not a reversal condition.

**Do not pre-empt problems another layer owns.** Exhaustive sanitization of upstream values and copies of judgments the server owns are
not made design goals of the presentation layer ([0020](../adr/0020-adopted-architecture.md), on not pre-emptively handling problems another layer owns).

<!-- boilerplate-only:begin -->
## The Role Boundary Is Permanently Out of Scope

What lies outside the presentation-layer role ([0011](../adr/0011-no-docker.md)) — business logic, persistence, credential
validation — will never be absorbed by this repository. Going full-stack and making self-hosting first class, which 0011 lists as triggers for
re-evaluation, are decisions that **change what this repository's product is**, not an extension of the line.

- **The unit being optimized is different.** What this repository optimizes is the presentation layer as a consumer of the contract. The moment it
  lives together with the contract's owner, the line the boundary checks guard — "do not leak types into inner layers" — loses its meaning
- **The hard parts are outside the repository.** Persistence, the authorization model and contract ownership are backend decisions
  ([0070](../adr/0070-backend-role-separation.md)), and if a template bakes in answers first, the choice is over before the constraints
  are seen
- **Out of scope is not forbidden.** It does not stop the creating side from widening the role on its own judgment. This side's responsibility is
  **to keep it traceable which premises would have to be rewritten** when someone decides to do so, and every non-adoption
  is recorded as an ADR

## Outside This Repository

The backend counterpart is a separate boilerplate written to the same policy (the source of the bundled sample's contract).
The premises this side places outside its boundary are held as the same premises on the other side. Whatever lands on the other side, the scope here
does not change.

<!-- boilerplate-only:end -->
## Where the Actual Work Is

Planned and in-progress work lives in the issue tracker. Anything that changes **why** the system has its current shape is
additionally recorded as an [ADR](../adr/README.md). This page is no more than a current summary of that.

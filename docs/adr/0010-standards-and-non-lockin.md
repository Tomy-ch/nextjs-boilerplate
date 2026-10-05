# Standards Conformance and Non-Lock-in (Principles of Design Judgment)

This ADR sets out the **permanent** part of the **axes of design judgment** that precede individual technical decisions. It is the meta-principle that works across every ADR: "**what to take in (conformance to standards) / how to justify that decision (the non-lock-in test) / whom the judgment is addressed to (judgment is made for the repository's present state)**".

Where [0020](0020-adopted-architecture.md) sets the **principles specific to the architecture pattern** (inward dependencies, structural types at boundaries, no type leakage, etc.), this ADR sets **the higher-level axes of judgment that govern how decisions are made in the first place**. 0020's design principles, the naming priority ([0028](0028-naming-convention.md)), the auth seam ([0079](0079-auth-frontend-seam.md)) / CSP ([0111](0111-csp-security-headers.md)) and others therefore all refer to this ADR's principles as their foundation.

## Status

Accepted

## Context

Rewriting the justification framework every time an ADR makes a decision to "ride on" something is redundant and also breaks local reasoning. This ADR codifies the permanent axes of judgment as **the place each ADR links to**. The results of applying them (the justification requirements for auth, the justification of the CSP, etc.) are held by each ADR that applies them.

## Decision

### 1. Conforming to Standards and De Facto Standards (Riding On)

- **The shape of a seam (connection point) rides on the platform's de facto standard.** It is not invented independently or neutralized. The priority order has the same shape as the naming convention ([0028](0028-naming-convention.md)) = **Next.js conventions > React conventions > this repository's own existing conventions and industry standards**.
- **Design philosophy, providers and implementation details are not fixed.** What is fixed is the shape of the seam, not the choice of what goes inside it.
- Example (the auth seam, [0079](0079-auth-frontend-seam.md)): it rides on the documented patterns of the official Next.js auth guide (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`) (httpOnly session cookie / an optimistic proxy + definitive authorization through the DAL / DTOs). Not riding on them = neutral invention is "reinventing the wheel", and betrays this repository's philosophy that "the frontend can be assembled without having to think about it" ([0011](0011-no-docker.md)).

### 2. Defining and Testing Vendor Lock-in

**The root test = who is doing the choosing.** If the designer is established as the one choosing, it is non-lock-in; if the vendor or library is the de facto decision-maker (the designer has not become the one choosing), it is lock-in.

The following two disjuncts are **diagnostics** that measure this root (either one holding is a sign of lock-in):

- **(a) Lack of portability** — there is no alternative other than that vendor
- **(b) Lack of justifying material** — there is no material that can reinforce the justification other than the vendor's authority

If either holds, in effect "the vendor chose" = the designer is not the one choosing. Conversely, if you could choose among alternatives on independent grounds, then "**out of many standards, the platform was chosen as one factor**" = it was chosen, not imposed, and is non-lock-in.

- **Operational test**: "**Is the pattern still justified if that vendor is taken out of the justification?**" If yes, riding on it does not bind you.
- Using framework-specific APIs (the `proxy.ts` convention / Server Actions / React `cache()`, etc.) is a consequence of a separate, already settled decision, "**that framework was chosen**" ([0011](0011-no-docker.md) / App Router de facto), and is not feature-specific lock-in. The lock-in question applies to *structural decisions*; if the structure (e.g. authorization is settled at the data boundary, optimistic checks in the proxy) is portable, it passes.

**Consequence (connecting to the reason ADRs exist)**: an ADR that decides to ride on a standard **always attaches vendor-independent justifying material** in its body. An ADR that ends with "X because the framework recommends it" hands the role of chooser to the vendor. An ADR that writes "out of {X, Y, Z}, X was chosen on grounds R that hold even with that vendor taken out" **constitutes the designer as the chooser by that very statement** = makes non-lock-in *provable*. Writing justifying material is the means by which the designer's agency as chooser is established.

### 3. Judgment Is Made for the Repository's Present State

The addressee of a judgment is **the state this repository is in now**, not the history that produced it. When comparing options and making a recommendation, compare on top of this snapshot — does it read as coherent to a reader who has never seen this repository and will not read its git log.

- **On this axis, quality and consistency outrank the cost of reaching them.** A numbering that contradicts the order it teaches, a convention not followed only here, a name kept only because fixing it is work — lean toward fixing them. The cost is shown alongside the recommendation (files touched, whose what breaks, what must be rebuilt), and the cost is not allowed to choose the answer. The decision to cut scope belongs to a human. "It already shipped" carries no weight, because what is distributed is a starting point, not a running deployment
- **The posture itself is the product.** Repository settings such as branch protection, dependency pinning, token permissions and the security policy are held as declaration files plus a setup procedure (`make setup-repo`) and are treated with the same quality bar as code. **Duplicating a repository copies only the tree** — neither branch protection nor token permissions are duplicated, so what is held is "the procedure that applies the settings", not the settings themselves ([0110](0110-security-operations.md) / [0153](0153-ci-configuration.md))
- **Do not make, by default, a decision the user should make.** If the user has not chosen the values sent externally and where they go, the default is not to send. Usage telemetry sent by the catalog build and registering analysis results into public datasets are off by default for this reason — that is a decision about the repository's name, not a technical decision
- **A layer that requires an external account may be bundled only if it costs nothing and does not break.** Make it free for public repositories and silently do nothing when not configured
- **Dependence on external design tools is one-way, repo → tool.** The authority on the design system is the repo; artifacts on the tool side are results of exploration and are not automatically synced into the repo (a human reads them and implements). Tool-specific procedures are not written into permanent documents (ADRs / `rules.md`); a skill holds them

### How the Principles Relate

① is **how what is included gets taken in**, and ② is **the common justification test running through that intake** (is the designer the one choosing). Even when ① rides on a de facto standard, the justification is secured by ② "is it justified with the vendor taken out". ③ fixes the **addressee** to which ① and ② are applied — judgment is made for the present snapshot, not for the history that produced it.

## Application (How to Apply)

- **An ADR that involves adopting something**: rides on the de facto standard per §1 and states §2's vendor-independent justifying material explicitly in its body.
- The status of applying these principles is held by each ADR that applies them. The auth seam ([0079](0079-auth-frontend-seam.md)) / CSP ([0111](0111-csp-security-headers.md)) are already justified with reference to this ADR.

## Prohibitions

- ❌ Justifying a decision to ride on a standard only with "because the framework recommends it" (it lacks vendor-independent material = hands the role of chooser to the vendor) (Enforcement: Prose — **not mechanizable**. Whether a justification carries material other than the vendor's authority is a judgment about the content of the argument)
- ❌ Inventing or neutralizing the shape of a seam on your own (ride on the de facto standard; §1) (Enforcement: Prose — **not mechanizable**. Whether the shape of a seam rides on the platform's de facto standard is a design judgment and is not decided by the shape of the code)
- ❌ Confusing the use of framework-specific APIs with feature-specific lock-in (it is a consequence of the separate settled decision "that framework was chosen"; §2) (Enforcement: Prose — **not mechanizable**. The lock-in test is the content of the argument about a structural decision and does not appear in code)
- ❌ Enabling by default a decision the user should make (sending data externally, registering into external datasets) (§3) (Enforcement: Prose — **partly mechanizable**. The known sending endpoints (Storybook's `disableTelemetry` / Scorecard's `publish_results`) could be caught by a gate checking their setting values, but no rule exists. Whether a newly added tool sends data out by default is each tool's behavior and is not decided by the shape of the code)

## Notes

- In the taxonomy of [0140](0140-documentation-operations.md), this ADR belongs to the **decision** class (an axis of judgment = a decision, not a rule enforced day to day).

## Related ADRs

- [0020-adopted-architecture.md](0020-adopted-architecture.md) — design principles specific to the architecture pattern. The concrete layer standing on this ADR's meta axes of judgment
- [0028-naming-convention.md](0028-naming-convention.md) — the naming priority (Next.js > React > our own) is one application of §1, conformance to standards
- [0011-no-docker.md](0011-no-docker.md) — the presentation-layer role / thin proxy / the character of the repository. The basis for §2's "the framework choice is a separate settled decision"
- [0070-backend-role-separation.md](0070-backend-role-separation.md) / [0043-middleware-policy.md](0043-middleware-policy.md) — the division of auth responsibilities and the proxy policy (the foundation on which the auth seam applies this ADR's principles)
- [0110-security-operations.md](0110-security-operations.md) / [0153-ci-configuration.md](0153-ci-configuration.md) — the content of the posture (supply chain, CI hardening)
- [0140-documentation-operations.md](0140-documentation-operations.md) — the documentation taxonomy (this ADR = the decision class)

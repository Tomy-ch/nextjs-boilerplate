# Project Policy

States the policy for maintaining and running this project.

## Maintainer Policy

<!-- boilerplate-only:replace-begin -->
This project is **an independent project managed by its author as an individual**. It has no affiliation with any particular company or
organization. Decisions about architecture and implementation are made on the basis of the author's design philosophy.
<!-- boilerplate-only:replace-with -->
<!-- = Decisions about architecture and implementation are made by the team that maintains this repository. -->
<!-- = -->
<!-- = Because they are judged on a single design philosophy rather than per-change preference, readers can trace whose judgment -->
<!-- = the design reflects. -->
<!-- boilerplate-only:replace-end -->

## Disclaimer

This project is provided in good faith. No warranty of any kind is given as to fitness for a particular purpose, security or operational stability
(MIT. [0142](../adr/0142-license.md)). When using it, check for yourself the vulnerabilities of dependent libraries,
the security settings, and compatibility with your operating environment.

## Maintenance Policy

<!-- boilerplate-only:replace-begin -->
The maintainer updates dependencies, applies security updates and improves the architecture as far as possible. No response deadline for Issues,
no bug fixes and no long-term continuation are guaranteed. If you find a problem, open an Issue.

Contributions are inbound = outbound — submitted contributions are accepted under the same MIT terms as the work, and no CLA or copyright assignment
is required ([0142](../adr/0142-license.md)).
<!-- boilerplate-only:replace-with -->
<!-- = Maintenance covers dependency updates, security updates and architecture improvements. -->
<!-- = -->
<!-- = What it does not cover — response deadlines, guaranteed bug fixes, how long it continues — is decided by who maintains it -->
<!-- = and within what scope of responsibility. State it explicitly rather than leaving it implicit. -->
<!-- boilerplate-only:replace-end -->

## Acceptance Criteria

**What a judgment addresses is the state this repository is in now, not the history that made it**
([0010](../adr/0010-standards-and-non-lockin.md)). Whether to add something is judged by whether it reads as coherent to a reader who has never seen
this repository and does not read its git log.

- **Quality and consistency take priority over the cost of reaching them.** A convention not kept only here, a name that survives only because fixing it is work —
  tip toward fixing. Show the cost alongside the judgment, and do not let the cost choose the answer
- **What is invested in is mechanisms that can intervene before confusion arises.** Scaffolds and specifications that settle placement and how to write first
  are that; lint and CI are after-the-fact breakwaters, and the playbook is no more than a rescue for the lost. At the same cost, put it
  in the former ([0143](../adr/0143-spec-driven-development.md) / [0155](../adr/0155-claude-skills-development.md))
- **State with each decision the means that keeps it.** Move conventions that a machine can enforce into tools, and if one can only be kept in prose,
  write why it cannot be mechanized ([0144](../adr/0144-decision-enforcement-pairing.md))
- **Do not make by default a decision the user should make.** If the user has not chosen the values sent outside and where they go,
  the default is not to send. A layer that needs an external account is bundled only in a form that silently does nothing when unconfigured
  ([0010](../adr/0010-standards-and-non-lockin.md))
- **Write a reason for what is not included.** A "won't do" that cannot give a reason is not a decision but a postponement. The list is
  [out-of-scope.md](out-of-scope.md)

## Library Selection Policy

The value lies not in any particular library but in **integrating widely used OSS as a coherent architecture**.
Selection is defined by [0004](../adr/0004-library-management.md).

- **The first screen is structural.** It has a single responsibility that can be named in one word, and it does not stand between two upstreams that are
  versioned independently. What fails here is not looked at quantitatively
- **The second screen is required and recommended criteria.** No unfixed known vulnerabilities, TypeScript types, version alignment with Next.js / React.
  Recommended: the burden of forking it in the worst case is known
- **Everything is an exact pin.** Keep the entry point for updates to a single Dependabot PR, and make every version change appear as one line of
  `package.json`. Major updates go in a separate PR
- **Freshly published versions are not taken.** Quarantine by cooldown buys time for upstream to detect a takeover and
  revoke it ([0110](../adr/0110-security-operations.md))

## Vendor Neutrality

**The shape of connection points rides on the platform's de-facto standard, and the choice of what fills them is not fixed**
([0010](../adr/0010-standards-and-non-lockin.md)). Riding on and being bound are different things, and the test is "is the pattern still justified with
that vendor taken out of the justification?".

- Using framework-specific APIs is a consequence of the settled decision "we chose Next.js", not feature-specific lock-in
- The single observability outlet is OTLP, and no vendor SDK is bundled ([0081](../adr/0081-observability-logging.md))
- Do not scatter direct vendor references into `features` / `components`; keep them replaceable behind `adapters` and the kernel
  boundaries ([0021](../adr/0021-frontend-responsibility.md))
- Dependence on external design tools is one way, repo → tool ([0055](../adr/0055-design-system-export.md))

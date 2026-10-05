# Project

Holds **what this repository is and what it is not**. Design decisions are held by [`../adr/`](../adr/), and per-topic
explanations by [`../design/`](../design/README.md); what this directory answers is the question that comes before them —
for whom, what is included, what is deliberately left out, and how versions advance.

## Documents

| Document | Question |
| --- | --- |
| [scope.md](scope.md) | Who is assumed to use it, for what kind of system. Uses it suits and uses it does not |
| [out-of-scope.md](out-of-scope.md) | What is deliberately not included. The reason for each item |
| [policy.md](policy.md) | What is added and what is not. Acceptance criteria and the maintenance stance |
| [roadmap.md](roadmap.md) | In which direction it is maintained. Not a schedule |
| [versioning.md](versioning.md) | How versions are assigned |

## Kept Elsewhere

| Kind | Where it goes |
| --- | --- |
| Choosing among options, decisions not to do something deliberately, and their reasons | [`../adr/`](../adr/) |
| Prohibitions enforced day to day | [`../rules.md`](../rules.md) |
| Per-layer responsibilities and acceptance scope | Each layer's `README.md` |
| Individual work items | The issue tracker |

## How to Read This

- **The decisions themselves are not here.** Each document is a summary and index of decisions, and the basis is where the links to the ADRs point.
  If they disagree, the ADR is authoritative ([0140](../adr/0140-documentation-operations.md))
- **out-of-scope is not a backlog.** An item leaves it only when the reason written for it no longer holds,
  and that is an ADR decision
- **This is where your own documents go.** Rewrite scope / out-of-scope
  to your own project's lines. For roadmap, rewrite the direction and inherit only the shape of the page

The sections of policy / roadmap that hold only upstream are replaced by the setup stripping ([Boilerplate-Only Conventions](../get-started/boilerplate-only-conventions.md)). <!-- boilerplate-only:line -->

# Reference

Holds **inventories that change in step with the code**. The documents here are not ADRs — they are not records of having decided something,
but **living references** that regroup what is in `package.json` and the configuration files right now into units a person can read.
When the code moves, they are rewritten in the same change; if they are not, they go stale.

This is the home of **inventory** in the four categories of [`docs/README.md`](../README.md). decision /
exclusion ([`adr/`](../adr/)) and rule ([`rules.md`](../rules.md)) carry a basis, but an inventory carries
none. **"Why this was chosen" is not written here** — writing it would let the inventory rot while wearing the face of a basis.
The selection decision is held by the ADR, and the inventory only links to it.

## Contract

| | Here (inventory) | ADR |
| --- | --- | --- |
| What it follows | **The code** (`package.json`, etc.), or **the source it was interpreted from** | Nothing. It is the decision itself |
| When it changes | Whenever its subject changes, **in the same change** | Only when a different option is chosen anew |
| What it answers | What exists and what it is responsible for | What was chosen and what was rejected |
| Which is authoritative | **The code side**. This is a regrouped copy | The ADR body |

The only reason to add, remove or rewrite an inventory row is that the change has happened on the code side. The inventory is never written
first with the code adjusted to it afterwards.

## Documents

| Document | Inventory of what | Authoritative |
| --- | --- | --- |
| [dependencies.md](dependencies.md) | Direct dependencies. A list grouped by responsibility, and the exceptions that span two upstreams | `package.json` |
| [upstream-interpretations.md](upstream-interpretations.md) | Pairs of external sources and the decisions derived from them. A three-valued verdict, and the source-side premise used for the verdict | **The source side**. Not this side's decision |

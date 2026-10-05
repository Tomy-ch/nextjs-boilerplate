# Type Design Discipline

This ADR sets what types express and what they do not. It covers four things — **boundary types / state types / identifier types / how types are given** — all disciplines for "moving what was checked at runtime into a shape that types can check".

[0021](0021-frontend-responsibility.md) is authoritative for where responsibilities live, [0072](0072-api-type-generation.md) for handling generated types, and [0062](0062-form-input-validation.md) for the two-layer split of display validation schemas; on top of those, this ADR covers "how to write the types themselves".

## Status

Accepted

## Context

If how types are given is left to judgment in each place, the same concern can be written in three shapes — state as a row of booleans, a boundary that carries `unknown` around and checks just before use, and identifiers passed along as plain `string`. In all of them errors appear only at runtime, and nobody notices unless a test steps on them.

Expressing in types what types can express is both moving verification earlier and **an explanation to the reader**. If the shape of a function tells what comes in, the caller does not need to read its body.

## Decision

### 1. State Is Expressed as Discriminated Unions

Do not express states that cannot hold at the same time as combinations of booleans. If the possible forms are finite and each form carries different values, make it a discriminated union. `ActionState<T>` in `model` is the paradigm of this shape.

The moment two booleans sit side by side, impossible combinations (both true, etc.) pass as types. **A union is used to "make impossible states unwritable"**, not to reduce branches.

### 2. Settle Types at the Boundary

Values from the outside are validated once at the boundary and passed inward **as a settled type** (parse, don't validate). zod runs the validation (the generated schemas of [0072](0072-api-type-generation.md) / the display validation schemas of [0062](0062-form-input-validation.md)), and the inside handles only validated types.

The shape of carrying `unknown` around and checking just before use is not adopted — because a missed check does not show up in the types.

#### Choose the zod style by whether the schema reaches the browser

**Schemas that reach the client are written with `zod/mini`; schemas closed to the server and generated artifacts are written with `zod`.**

Measured by writing the API surface in use (`z.object` / `z.string` / `z.array` / `z.int` / `z.boolean` / `z.uuid` / `z.email` / `z.coerce` / length and format checks / `safeParse` / `flattenError`) both ways, the difference is **63.5 KB → 5.4 KB (gzip)**. `zod`'s default entry point carries JSON Schema conversion and locales for error messages that this repository does not call, and those **are handed out to everyone who opens a screen**.

- **The discipline of parsing at the boundary does not change.** Only the way of writing changes, differences such as `.min(n, msg)` becoming `.check(z.minLength(n, msg))`. The validation contents and messages carry over as they are
- **The server side is not aligned.** It does not ship in the bundle, so there is no benefit, and generated artifacts (`0072`) are output in `zod` by the generator, so there is no choice. **The value of choosing only for the side that ships outweighs the value of converging on one**
- **Layers that accept both are written with the core types.** `zod` and `zod/mini` share `$ZodType` from `zod/v4/core`. If a shared layer (client HTTP calls, etc.) required one style, the callers' migration would stall for that one place
- **Pass to react-hook-form with `standardSchemaResolver`** ([0062](0062-form-input-validation.md)). `zodResolver` requires `zod`'s types, but `zod/mini` implements Standard Schema, so it connects through the standard-side interface

**As long as there is a route by which `zod` enters the client through generated artifacts, moving only the client side does not remove zod classic (the full `zod` entry point)** (mini would only be added on top). That route is closed by carving a constants-only module out of the generated artifacts and having the client pull only that ([0072](0072-api-type-generation.md) moves constraint constants into a module separate from validation). If an import appears from a client island that reaches `zod`'s default entry point or a generated schema, `scripts/client-schema-weight.gate.test.ts` fails.

#### Partial-update payloads give `undefined` no meaning and are normalized in `adapters`

`exactOptionalPropertyTypes` is not enabled. Its gap — that types do not distinguish "the key is absent" from "the value is `undefined`" — is filled by a mechanism, not a prose convention.

`JSON.stringify` drops keys whose value is `undefined`, so `{ name: undefined }` and `{}` are identical on the wire. An `undefined` meant as "clear it" arrives as "leave it untouched", and the receiving side cannot tell them apart. The remaining risk is only in local assembly before serialization, so **normalization of PATCH payloads is confined to one place in `adapters` (`adapters/server/http`)**.

- "Leave untouched" = omit the key / "clear" = explicit `null`. `undefined` carries no meaning
- The public surface of `adapters` **accepts only the normalized type** (`PatchPayload<T>` = a type whose values do not allow `undefined`). The discipline is enforced by types, not left to the caller's care
- "Keys with `undefined` disappear / `null` remains" is pinned down by tests

### 3. Identifiers Are Branded Types

**Identifiers coming from outside are not treated as plain `string`.** Values that **have the same shape and still type-check when mixed up**, such as per-resource IDs, get a brand.

- **What gets one**: identifiers entering from external APIs, URLs and forms. Things that can be mixed up
- **What does not**: display-only strings, and values closed within one function
- **Where the brand is given is the exit of validation.** It is attached to the value settled by the zod schema. **`model` holds no decision logic**
- **What `model` holds is the type and the minimal functions around it** (equality, stringification). Special decisions or logical checks are not brought in (business judgment belongs to the backend; [0070](0070-backend-role-separation.md))

Even if the backend side protects the same identifier with types, **this repository does not trust the responses of external APIs**. The guarantee is cut off the moment the boundary is crossed, and it is reattached on this side.

### 4. Check Types with `satisfies`; Do Not Flatten Them with Annotations

When giving a value a type, use `satisfies` rather than a type annotation. An annotation **widens** the value's type to the declared type, losing literal information (the set of keys, the concrete values). `satisfies` checks conformance while keeping the value's own type.

- Variables, object literals, array literals: use `satisfies`
- Function parameters and return values: use annotations (a contract with the caller; a wide type is fine)

**Exception: declarations whose type itself is a contract for the reader may use annotations.** Exports whose shape the framework sets (`metadata`, etc.) and registries where the concrete values of elements carry no meaning (lists of paths, etc.) fall under this. For the former, being able to read from the type that "this is a value handed to the framework" is valuable; for the latter, narrowing the values has no use.

## Prohibitions

- ❌ Expressing states that cannot hold at the same time as combinations of booleans (Enforcement: Prose — **not mechanizable**. Whether two booleans cannot hold at the same time is decided by the values' meaning, not by the shape of the type)
- ❌ Carrying `unknown` into inner layers and checking just before use (Enforcement: Prose — **partly mechanizable**. `unknown` appearing in parameters / props of inner layers (`model` / `components` / `features`) could be caught statically, but no rule exists. Whether a check just before use stands in for boundary validation is decided by meaning)
- ❌ Passing identifiers from outside into inner layers as plain `string` (Enforcement: Prose — **not mechanizable**. Whether a `string` is an externally sourced identifier and whether it can be mixed up is decided by the value's origin and meaning, not by the shape of the type)
- ❌ Bringing decision logic or business rules into `model` (only types and minimal functions) (Enforcement: Prose — **not mechanizable**. Whether something is a minimal function or decision logic is decided by the function's meaning, not by the shape of the code)
- ❌ Annotating literals and dropping information (use `satisfies`) (Enforcement: Prose — **partly mechanizable**. Type annotations on variable declarations initialized with object or array literals could be caught statically, but no rule exists. The exceptions for framework-shaped exports and registries are decided by the meaning of the declaration)
- ❌ Skipping validation with an `as` type assertion (boundary validation is done by zod)
- ❌ Writing schemas that reach the client with `zod`'s default entry point (functionality that is never called gets handed out) (Enforcement: `scripts/client-schema-weight.gate.test.ts` (fails when a module reachable from the client pulls `zod`'s default entry point))
- ❌ Giving `undefined` the meaning "clear" in partial-update payloads, and normalizing outside `adapters`
- ❌ Making a separate copy of your own on the inside (converting to numbers, rounding to defaults, etc.) apart from the validation the fetch endpoint holds
- ❌ Silently discarding conditions that fall outside the contract and returning a default result

## Related ADRs

- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — where responsibilities live / criteria for splitting components within a feature
- [0062-form-input-validation.md](0062-form-input-validation.md) — the two-layer split of display validation schemas
- [0070-backend-role-separation.md](0070-backend-role-separation.md) — where business judgment lives
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — the fetch wrapper (the place where partial-update normalization sits)
- [0072-api-type-generation.md](0072-api-type-generation.md) — type generation from the contract / handling of generated artifacts

---
imports-allowed: [] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [hand-editing, application-types]
coverage-exclusions:
  - "src/adapters/gen/**"
---

# Generated Artifacts from the Contract

The home of the wire types and zod schemas that `make api-gen` generates from the contracts imported into `openapi/`
([0072](../../../docs/adr/0072-api-type-generation.md)). **Do not edit by hand.** Edits are lost on the next generation, and
CI's drift gate detects the difference and fails.

## Structure

Each contract gets its own subtree. Contracts move their versions independently, so reconciliation and regeneration are shaped to run per contract.

| Path | Contents |
| --- | --- |
| `<contract-name>/model/` | Wire types. Correspond to the contract's `components.schemas` |
| `<contract-name>/endpoints.zod.ts` | zod schemas per operation. Used for response validation |
| `<contract-name>/limits.ts` | Of the limits and formats the contract defines, a copy of **only the constants that involve no validation**. Written not by orval but by [`scripts/openapi/extract-limits.ts`](../../../scripts/openapi/extract-limits.ts). The client takes only this ([0072](../../../docs/adr/0072-api-type-generation.md)) |

## Usage Boundaries

- **Responses are validated with the zod schemas here, and the enforcement point is the fetch wrapper in `adapters/server`**
  ([0071](../../../docs/adr/0071-bff-api-integration.md)). Backend responses have no server-side
  runtime validation, so the front end's generated validation is the last line of defence against contract breaches
- **Do not pass wire types to inner layers** ([0020](../../../docs/adr/0020-adopted-architecture.md), the design principle that keeps external types out of inner layers).
  What `model` and features touch is the type after `adapters` has converted it. OpenAPI's constraints are a wire contract,
  not domain rules
- **There is no HTTP client here.** orval requires an output location for the client, but outbound
  resilience (timeout / retry / breaker) is owned by the hand-written wrapper in `adapters/server`. The generated
  client is not used, so it is placed on the `mocks/` side

## Handling biome

This directory is **excluded from the linter** (`overrides` in `biome.json`). Only formatting is applied.
Imposing conventions on code with no author would stop CI on the generator's output style every time the contract changes,
leaving "patch the generator" as the only fix. The correctness of the generated artifacts is guaranteed by whether regenerating from the contract
matches (the drift gate).

## Regeneration

```bash
make api-gen        # 契約から生成し、整形まで行う
make api-gen-check  # 契約と生成物の版が揃っているかだけを検証する
```

---
imports-allowed: [] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [http-vocabulary, external-dependencies]
test-requirement: unit
---

# errors

The kernel of protocol-agnostic, application-wide errors that every layer can reference. It holds classification, cause, and display metadata separately — the classification is used inside for decisions, the cause stays traceable as `cause`, and the display metadata can be overridden outside.

## What Belongs Here

- The transport-independent error classification vocabulary, and the type that puts it on the `cause` chain
- The catalog of default display metadata per classification (a machine-readable code and user-facing text)
- The entry point that layers display metadata while keeping the cause chain, and the entry points that extract the classification and metadata from the chain
- A function that replaces secret values contained in a message, as named by the caller

## What Does Not Belong Here

- Protocol-derived vocabulary such as transport status, response formats and headers (the prohibitions of [0080](../../docs/adr/0080-error-handling.md))
- Dependencies on other kernels and external packages (the dependency matrix of [0021](../../docs/adr/0021-frontend-responsibility.md))
- Log output (the responsibility of `logging` and the boundaries)

## Public API

- `ErrorKind` / `errorKinds` — The classification type and named constants, and the array of all classifications
- `AppError` / `createAppError()` — A classified error that keeps its cause in `cause`
- `findAppError()` / `isAppError()` — Finding the classification within the cause chain
- `ErrorMeta` / `createErrorMeta()` — Code, user-facing text, requestId, and publishable detail identifiers. Immutable; `withMessage()` returns a copy with only the text replaced
- `withErrorMeta()` / `withErrorDetails()` / `errorMetaFrom()` — Metadata wrappers that keep the cause chain. Outer metadata takes precedence
- `getDefaultErrorMeta()` — The default metadata from the classification catalog
- `resolveErrorMeta()` — Resolves code, text and details from the classification catalog and the outer metadata
- `redactMessage()` / `redactedValue` — A function that replaces explicitly specified secret values before wrapping, and the fixed replacement string

## Modules

| Module | Role |
| --- | --- |
| `error-kind.ts` | The classification vocabulary. Holds named constants with the same name as the type; the leaf other modules depend on |
| `app-error.ts` | `AppError`, which puts the classification on the cause chain, and the function that walks the chain from the outside to find the classification |
| `error-meta.ts` | Display metadata attached independently of classification, and the functions that put it on the chain and extract it from the chain |
| `error-catalog.ts` | The table of default metadata per classification, and the function that resolves display metadata from the chain's classification and outer metadata |
| `redact.ts` | Replacing secret values |

Dependencies run one way, `error-kind` → `app-error` / `error-meta` → `error-catalog`; `redact` is independent.

## Error Classification

`ErrorKind` is the only definition of the classification vocabulary, and callers use named constants such as `ErrorKind.INVALID_ARGUMENT`. The classification is protocol-agnostic; the adapters boundary handles conversion to HTTP status.

| `ErrorKind` | Meaning / when to use |
| --- | --- |
| `INVALID_ARGUMENT` | An argument that is syntactically correct but semantically invalid |
| `UNAUTHENTICATED` | Authentication failure or not logged in |
| `PERMISSION_DENIED` | Insufficient permission |
| `NOT_FOUND` | The target does not exist |
| `CONFLICT` | Unique constraint violation, concurrent update conflict, and the like |
| `VALIDATION` | Domain or use-case validation failure |
| `UNSUPPORTED_MEDIA_TYPE` | An unsupported input format |
| `PAYLOAD_TOO_LARGE` | Input exceeding the allowed size |
| `URI_TOO_LONG` | The URL carrying the conditions is too long. What the user should reduce differs from `PAYLOAD_TOO_LARGE`, where the body is large |
| `TOO_MANY_REQUESTS` | Rate limiting, or throttling by an external dependency |
| `CANCELED` | Processing aborted by the caller. A cutoff, not a failure, and not a target for retry |
| `INTERNAL` | An unexpected internal error. A response in a shape different from the contract also goes here, distinguished from a communication failure |
| `UNIMPLEMENTED` | An unimplemented or unsupported feature |
| `UNAVAILABLE` | Temporary unavailability, such as an external dependency outage |

The classification vocabulary is built like this.

- **Values are kebab-case string literals**; the type `ErrorKind` is the union of the values, and the constant `ErrorKind` is an object of the same name. `enum` is not used (`docs/rules.md#types`). The constant is checked against the type with `satisfies`, so literal information is not lost ([0029](../../docs/adr/0029-type-design-discipline.md))
- `errorKinds` is the array of all classifications and exists **so that boundary-side tests can exhaustively check that a table taking a classification as its key fills in every classification**. Places where a gap in the table is found by a test rather than by the type (such as mappings built with `switch`) use it when a classification is added
- The primary key of a classification is its meaning, not the spelling of the connected service's code. The mapping between classifications and stable error codes, and the table of correspondence with HTTP status, are held by [0080](../../docs/adr/0080-error-handling.md)

### Steps to add a classification

1. Add it to both the type union and the constant in `error-kind.ts`
2. Add a code and user-facing text to the default metadata in `error-catalog.ts`. The table is a `Record<ErrorKind, ErrorMeta>`, so type checking does not pass until it is added
3. Add one row to the classification table in this README
4. Fix both directions of the table, status → classification and classification → status, in each `adapters` endpoint that holds a conversion (server and client each). A gap in classification → status is found by the test that iterates `errorKinds`, but **status → classification tips any status not in the table to `INTERNAL`, so a gap silently becomes `INTERNAL`** — fix both directions at once
5. Fix the correspondence table in [0080](../../docs/adr/0080-error-handling.md)

## Layering Classification and Metadata

Both classification and metadata are put on the cause chain, and **walking the chain from the outside, the first one found wins**.

- **To change the classification, wrap it with an `AppError` on the outside.** The inner classification stays as is, so it can be traced later
- **To add context without changing the classification, wrap it with something that is not an `AppError`.** Pass `{ cause }` to a plain `Error`, or put text on it with `withErrorMeta()`. In both cases `findAppError()` returns the inner classification. When a lower layer distinguishes "unreachable" from "the response is not in the expected shape" by classification, repackaging it as a new failure in an upper layer would make the two look the same — keep the lower layer's classification and add only text
- **Outer metadata replaces inner metadata. They do not mix field by field.** Wrapping `withErrorDetails()` over `withErrorMeta()` means the inner code and text are not used for resolution, and it falls back to the catalog defaults. Combine the metadata for one error into one, at the place it is attached
- For the code and text of `ErrorMeta`, **an empty string means "unspecified", and `resolveErrorMeta()` fills it with the catalog default**. `requestId` and `details` come only from the outer metadata
- `ErrorMeta` is immutable. `details` is copied both at creation and at retrieval, so changing the passed array later, or rewriting the retrieved array, does not reach its contents
- Walking the chain detects cycles and stops. Passing an error whose `cause` points to itself returns `undefined`

## Resolving Display Metadata

- **The catalog's text conveys only the classification.** "接続できません" ("Cannot connect") does not tell whether the destination is down or the destination is wrong. A boundary holding context known only there, such as the destination, keeps the classification and puts text on it with `withErrorMeta()`. The source of truth for text is the catalog, so replacing text, including with `withMessage()`, is limited to the boundary layer
- `resolveErrorMeta()` returns `undefined` for an error with no classification. **Tipping an unclassified error to `INTERNAL` is the decision of the calling boundary**, written in the form `resolveErrorMeta(error) ?? getDefaultErrorMeta(ErrorKind.INTERNAL)`. A value with no classification was thrown on an unexpected path, so this layer cannot choose the form to show the user
- `AppError` derives from `Error` and `ErrorMeta` is a class with `#private`; neither is a plain value, and **they do not cross the Server Action / RSC serialization boundary**. Before crossing, reduce them to plain values of code, text and classification with `resolveErrorMeta()` and `findAppError()`. The container returned to the screen is held by `model` ([0080](../../docs/adr/0080-error-handling.md))
- In production, the body of an error thrown from a Server Component is hidden, and only `digest` reaches the error boundary. **The error boundary does not resolve from the error it receives; it shows the text of `getDefaultErrorMeta(ErrorKind.INTERNAL)`** ([0080](../../docs/adr/0080-error-handling.md))

## Replacing Secret Values

`redactMessage()` is value-based replacement in which **the caller names what to hide**. Its axis differs from `logging`'s table that hides by name (field names such as `authorization` / `password`); it exists to erase values embedded in message strings built in this layer, which do not ride on structured fields. The replacement string `redactedValue` is the same `[REDACTED]` that `logging` uses.

- Secret values are deduplicated, empty strings are discarded, and **longer values are replaced first**. Replacing a short value first would leak the rest of a longer value through a partial match
- Replacement is done by splitting and joining strings, without building a regular expression. Even if a secret value contains symbols, there is no need to think about escaping
- **Replace before wrapping** ([0080](../../docs/adr/0080-error-handling.md)). If the raw value remains inside the chain, replacing it outside does not help: it can be read by walking the chain

## Usage Examples

```ts
const cause = new Error(redactMessage(`token=${token}`, [token]));
const classified = createAppError(ErrorKind.UNAUTHENTICATED, { cause });
const error = withErrorDetails(classified, ["accessToken"]);

const meta = resolveErrorMeta(error);
```

`requestId` is used for log correlation and for matching contacts from users, so it can be shown on the common error screen. For `details`, specify only identifiers that are safe to put on the wire. Display names on the screen are converted on the feature / form side, which knows the business fields. Do not pass input values, tokens, passwords or reason text.

### Usage per layer

| Layer | Entry point used | Form |
| --- | --- | --- |
| `adapters` (the classifying side) | `createAppError()` / `withErrorDetails()` | Classify the raw failure exactly once, put the detail identifiers the contract returned on the cause side, and throw. An attempt that got no response does not inherit the previous attempt's details (the classification and the details would come from different attempts) |
| `features` / `model` (the branching side) | `findAppError(error)?.kind === ErrorKind.X` | **The signal for branching is the classification, not the text** (`docs/rules.md#wording`). Branches such as tipping not-found to `null`, reloading on expired authentication, or mapping `details` to fields on validation failure happen here |
| Display / response boundary | `resolveErrorMeta()` / `getDefaultErrorMeta()` | Text comes from the catalog and is not written per screen or endpoint. Unclassified errors tip to `INTERNAL` |

The side mapping `details` to field names **does not rely on the contract's field names being spelled the same as the screen's field names**; it checks them against the table of field names the screen knows before using them. Using an unreadable name as a key as is would put an error into the state that is tied to no input field. Reason text is not carried in `details`, so the text at the mapped destination can say no more than "it was not accepted".

## What to Change When Adopting

This repository adopts `requestId` and `details` as additional information on backend errors.

- `requestId` — An identifier used for log correlation and matching contacts. It can be shown on screen as a request ID
- `details` — An array of identifiers safe to publish, such as invalid fields. The feature / form converts them to display names

This is this repository's default and is not common to every backend contract. If the adopting project uses `traceId` / `correlationId`, an array of `fieldErrors` objects, or another error format, change the adapter's response conversion and `ErrorMeta` to match the contract. Do not add transport-specific processing to the `errors` kernel.

The catalog's codes are this repository's vocabulary, never put on the wire, and are not aligned with the spelling of the connected service ([0080](../../docs/adr/0080-error-handling.md), which defines this code vocabulary). The text is Japanese, one per classification.

## Boundaries

- It does not hold transport status or response formats
- Classification from the raw transport response is done exactly once, at the `adapters` boundary
- The decision to normalize unclassified errors to `internal` is also the boundary's responsibility
- Log level and log output are the responsibility of `logging` and the boundaries. errors itself outputs nothing

## Audit Criteria

| Criterion | How It Is Judged | Basis |
| --- | --- | --- |
| `forbidden: http-vocabulary` — holds no HTTP status, response shape, or transport-specific vocabulary. The `adapters` boundary holds conversion from classification to status | violation. suggestion when it cannot be told from the spelling whether a number or type derives from transport | The prohibitions of [0080](../../docs/adr/0080-error-handling.md) / Boundaries in this README. Mechanical: ESLint `no-restricted-syntax` rejects identifiers `http` / `status` / `response` and `http(s)` string literals |
| `forbidden: external-dependencies` — imports neither other kernels nor external packages | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) (what each kernel is responsible for). Imports of other kernels are mechanical: ESLint boundaries. Imports of external packages are beyond the machine's reach |
| errors itself does not output logs | violation if there is a `console` or logger call | Boundaries in this README |
| Display codes and text are held only by the per-classification catalog, not by `AppError` and `ErrorKind` | violation if `AppError` or the classification definition has a code or text field | [0080](../../docs/adr/0080-error-handling.md) (where display codes and text live) / Resolving Display Metadata in this README |
| Wrapping does not cut `cause` | violation if an original error is rewrapped without passing `{ cause }` | [0080](../../docs/adr/0080-error-handling.md) (the order of wrapping and replacement) / Layering Classification and Metadata in this README |
| Every classification has default metadata in the catalog | violation | Mechanical: the table type `Record<ErrorKind, ErrorMeta>` in `error-catalog.ts` |

## Related ADRs

- [0021](../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries. The line separating classification from transport
- [0029](../../docs/adr/0029-type-design-discipline.md) — Type design that holds classifications as discriminable values
- [0080](../../docs/adr/0080-error-handling.md) — Normalizing backend errors, and the division of responsibility with the screen side (`error.tsx` / `not-found.tsx`)

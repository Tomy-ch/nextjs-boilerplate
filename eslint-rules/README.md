---
test-requirement: unit
---

# eslint-rules

The home of custom ESLint rules that hold only the checks biome cannot express
(the capability-based split of [0002](../docs/adr/0002-formatter-linter.md)). They are applied by
[`eslint.config.ts`](../eslint.config.ts) as `project-rules/<rule-name>`. Rules placed here do not run under
`pnpm lint` (biome only); they run under `pnpm lint:ci` and `pnpm exec eslint <path>`
([0002](../docs/adr/0002-formatter-linter.md) sets out which command runs which tool).

**A rule holds only the check, never the convention.** What is forbidden and why is owned by a section of
`docs/rules.md` or by a layer README, and the rule's leading comment names that owner. Conversely, the
owner's "enforced via" names `project-rules/<rule-name>` ([0144](../docs/adr/0144-decision-enforcement-pairing.md)).
A state where only one side exists is a decision cut off from its enforcement.

## Rules in Place

| Rule | What it checks |
| --- | --- |
| [`no-ad-hoc-cache-tag`](no-ad-hoc-cache-tag.ts) | The number of levels in an invalidation tag (up to two: `<resource>` and `<resource>:<identifier>`) and where tags are attached (one place, `src/adapters/` on the fetching side). Whether the resource name matches the contract's collection name cannot be decided without reading the contract, so it is not checked |
| [`no-anonymous-default-export`](no-anonymous-default-export.ts) | A default export without a name. The 1:1 gate requires a name `describe` can point at ([0090](../docs/adr/0090-testing-strategy.md)). Two forms pass: a named function / class declaration, and a reference to an identifier — only the latter can default-export an arrow function, and only allowing both makes every writable form available |
| [`no-app-wide-revalidate`](no-app-wide-revalidate.ts) | Revalidation that discards the whole app (`revalidatePath("/", "layout")`). It is not an ownership boundary, so it is an exception only when the updated value appears in the outer frame attached to every screen, declared with a reason on `eslint-disable-next-line` ([0071](../docs/adr/0071-bff-api-integration.md)). The ownership boundary itself cannot be decided without reading the contract and the screens, so it is not checked |
| [`no-arbitrary-z-index`](no-arbitrary-z-index.ts) | Arbitrary values for stacking levels (`z-[…]`, and negative `-z-[…]`). They squeeze between the step values, and which is on top can no longer be decided without reading the whole screen |
| [`no-cache-option-in-use-cache`](no-cache-option-in-use-cache.ts) | `cache` / `next` passed to `fetch` in a module with `use cache`. Since the inner layer cannot be invalidated, even when the outer layer refetches it grabs the same stale response |
| [`no-captured-bearer-token`](no-captured-bearer-token.ts) | A captured value passed to the credential fetch endpoint. `getBearerToken` accepts only the imported endpoint, and `bearerToken` (the exception during establishment) only a parameter of the enclosing function. Passing a captured value means `cookies()` is not read, and the cached scope defense silently drops away ([0112](../docs/adr/0112-data-classification-cache-boundary.md)). Only the side that passes the value (an object literal property) is checked; destructuring on the receiving side passes even with the same spelling. Tests are out of scope |
| [`no-client-outside-connection-port`](no-client-outside-connection-port.ts) | Building an external API client outside a connection point (`CONNECTION_PORTS` in [`architecture.ts`](../architecture.ts)). The circuit breaker and retry budget ride on the client, so splitting the same target splits degradation decisions ([0071](../docs/adr/0071-bff-api-integration.md)). Places that cannot be consolidated, such as receiving the target per call, declare themselves with a reason on `eslint-disable-next-line`. Import spellings are resolved to real files before judging, so the same spelling on the client side does not match. It fails every form that pulls the builder function as a value (alias / namespace / re-export / dynamic `import()`), and lets type-only imports pass. Tests are out of scope |
| [`no-internal-anchor`](no-internal-anchor.ts) | A raw `<a href="/...">` for an internal link. It loses client navigation and prefetch |
| [`no-markup-outside-ui-layers`](no-markup-outside-ui-layers.ts) | DOM markup outside the layers where UI may live (`UI_KERNELS` in [`architecture.ts`](../architecture.ts)). Only host elements (lowercase-initial) are checked; Provider composition and fragments pass even as JSX. The finding is about placement, not elements, so one report per file. Tests are out of scope |
| [`no-raw-font-weight`](no-raw-font-weight.ts) | Direct weight specification (`font-medium` etc.). Weights the typeface does not have are rounded and do not read as emphasis ([0051](../docs/adr/0051-styling-system.md); the convention is `src/components/README.md`, Font Weight). `font-normal` is a reset and out of scope. Excluding tests and stories is owned by `ignores` in `eslint.config.ts` |
| [`no-user-scoped-in-cached-module`](no-user-scoped-in-cached-module.ts) | Importing a user-scoped fetch endpoint from a module holding a server-persisted cache (`use cache`) (stage 2 of [0112](../docs/adr/0112-data-classification-cache-boundary.md)). The check is per module, reading the spelling declarations of the import target and one level beyond. A kernel that builds clients one level beyond (`HTTP_CLIENT_FACTORY` in [`architecture.ts`](../architecture.ts)) is not counted (that the spelling remains is watched by `scripts/scope-spelling.gate.test.ts`) |

## Lines the rules share

Each rule checks something different, but the way judgment is placed is aligned. New rules follow these
lines too.

### Look only at statically determined spellings

**What the shape of the code does not decide is not checked. No guessing.** Tags or paths passed in
variables, `href` or classes built from expressions, `fetch` options passed in variables, keys built with
`[identifier]`, and dynamic `import()` given a variable are not judged, because their spelling is not decided
on the spot. Not looking is a line drawn, not "missing things", and the tests pin it on the valid side (see below).

- **String literals are a form that can always be picked up.** Classes and `href` can only be written as
  strings, so looking at literals and `TemplateElement` picks up everything written. Numbers, booleans and
  `null` are also visited as `Literal`, so check that it is a string first.
- **Template literals containing expressions are read only when the spelling needed for the decision
  remains in `quasis`.** Joining only the `quasis` makes expressions vanish — `` `/${locale}` `` looks like
  the root `/`, mistaking a non-root path for discarding everything (`no-app-wide-revalidate` does not look
  at forms with expressions). Conversely, what remains on the `quasis` side, such as the number of
  separators, can be read even with expressions (`no-ad-hoc-cache-tag`).
- **A literal key has a settled spelling even when written as `[...]`.** Letting `["getBearerToken"]` pass
  as a "computed key" would let anyone escape the rule by adding brackets. Only keys whose value is decided
  at runtime, such as `[identifier]`, are unsettled.

### Match calls by the name of a bare identifier

Calls such as `cacheTag` / `revalidatePath` / `fetch` are checked only when `callee` is an `Identifier` with
a matching name. Forms whose name is decided by an expression, such as `cache["cacheTag"](…)` /
`cache.revalidatePath(…)`, are not checked (for the same reason as the line above). That different functions
sharing only the name (`addTag` / `revalidateRoute`) are not caught, and that non-call references
(`const f = revalidatePath`) are not caught, are pinned by the tests on the valid side.

### Judge location relative to the base, up to the separator

`context.filename` comes either relative or absolute. Rules that judge by location `resolve` / `relative`
from `context.cwd` as the base before comparing, and compare **including the separator**.

- Treating a prefix-only match as inside makes `src/adapters-legacy/` look inside `src/adapters/`. Areas are
  compared with `startsWith` against `resolve(cwd, area) + sep`.
- Matching `src/` anywhere in the file name makes the inside of `docs-viewer/src/` in the workspace look like
  a layer too. The layer is taken as `^src/<layer>/` at the head of `relative(cwd, filename)` (`\` is
  normalized to `/`).
- Per-file declarations such as connection points are compared by equality between `relative(cwd, filename)`
  and the declaration.

### Read placement declarations from `architecture.ts`; hold no copy

The layers where UI may live, the connection points, and the kernel that builds clients are read by
importing the declarations in [`architecture.ts`](../architecture.ts). Copying them into a rule option
(`meta.schema`) or a constant leaves one side stale when the declaration moves. For the same reason, things
whose **declaration itself can be read**, such as the classification (user-scoped), are read from the
spelling in the real files without holding a list — if that spelling broke, lint would merely fall silent,
so a separate gate (`scripts/scope-spelling.gate.test.ts`) asserts, with counts, that the spelling remains.

**When two or more rules need the same decision, one module holds that predicate**
([`cache-directive.ts`](cache-directive.ts) is an example). This avoids spellings growing on one side while
the other silently goes stale.

### Decide module-level checks at `Program:exit`

A check conditioned on **a declaration that applies to the whole module**, such as `use cache`, does not
report mid-scan. The declaration is a string literal in an expression statement (a `Literal` whose parent
is an `ExpressionStatement`) and can also sit inside a function, so it can appear after imports and `fetch`.
Candidates are collected into an array and reported after checking for the declaration at `Program:exit`.
The tests pin "forms written before the declaration are also reported". Literals directly under an
expression statement are not only declarations (`42;` stands in the same position), so check that it is a
string first.

### Where to report

- **`eslint-disable-next-line` works only on the first line of a declaration**, so findings that allow
  declaring an exception through suppression are reported on the declaration itself, not on the specifier.
- **Findings about placement are kept to one per file.** Reporting per element lists as many findings as
  there are elements even though there is one thing to fix.
- Messages carry three things: "what not to pass / write", "what happens if you do", and "what to use
  instead". A message that only states the prohibition sends the fixer off to find the convention's owner.

### Declaring exceptions

Judgments the rule does not make (whether an exception is legitimate) stay with people. An exception is
declared with `eslint-disable-next-line project-rules/<rule-name>` and a reason on that line. No dedicated
spelling is created because `docs/rules.md#comments` forbids custom prefixes, and suppressions that have no
effect are failed by `reportUnusedDisableDirectives` ([`eslint.config.ts`](../eslint.config.ts)).

### Excluding tests and stories

Tests verify the behavior of fetch endpoints and builders, and sometimes render a wrapper to run a hook.
They are not UI the bundle or a layer carries, so they are excluded from that rule's check. There are two
places for exclusion, and the reason decides the place.

- **If the reason belongs to the rule itself** (tests do not ride in the bundle this check protects),
  exclude inside the rule by looking at `context.filename`.
- **If the reason belongs to the kind of target** (stories are samples, not classes screens use, for
  example), exclude with `files` / `ignores` in `eslint.config.ts` and write the reason there. The rule
  stays in a form that applies to every file.

## Reading other files

Rules that use import targets as decision material judge **after resolving to real files**, not by spelling.
The same relative spelling can point at different real files, as across the request boundary between the
server side and the client side.

- `resolveModule(specifier, filename, cwd)` in [`module-resolution.ts`](module-resolution.ts) resolves alias
  (`@/`) and relative spellings to real files in the order `.ts` / `.tsx` / `/index.ts` / `/index.tsx`. Bare
  package names are not resolved — dependency packages hold no declarations to read, and resolving them
  would need a `node_modules` search. Spellings that cannot be resolved provide no decision material, so
  they pass.
- **A relative spelling is resolved from the file that wrote it.** When reading one level beyond, pass the
  first level's real file as `filename`. Resolving from the linted file makes the relative imports one level
  beyond unreachable.
- **ESLint does not provide a syntax tree for files that are not lint targets**, so `moduleSpecifiers(source)`
  picks up spellings with `typescript`'s lexical analysis (`ts.preProcessFile`). It picks up static
  `import` / `export … from`, side-effect-only `import "…"` and dynamic `import("…")`, and not spellings
  inside comments or strings.
- `importKind` / `exportKind` (type-only import / export) exist only in TypeScript's syntax tree, not in
  ESLint's types (estree). Read them with `Reflect.get`.
- When judging by the kind of binding (an imported endpoint, or a parameter of the enclosing function),
  walk `upper` from `context.sourceCode.getScope(node)` to find the variable and look at `defs[].type`
  (`ImportBinding` / `Parameter`). The endpoint being passed is imported at module top level while the
  passing side is inside a function, so the nearest scope alone misses everything.

How deep to follow is cut at the range that fits that stage's role. Stopping one level beyond and leaving
deeper paths to the framework's defenses and the fetch-time gate is the cut `no-user-scoped-in-cached-module`
makes, as an example.

## Test Responsibilities

The frontmatter's `test-requirement: unit` applies to the rule bodies. Get one decision wrong and a rule falls
into **"there are targets, yet zero findings and green"**, and nobody can see it broke. That is why
[0090](../docs/adr/0090-testing-strategy.md) keeps this out of the coverage exclusions, and each rule's
tests hold both the violating side and the non-violating side.

### Test Structure

- Build ESLint's `RuleTester` with the `typescript-eslint` parser. Rules that read JSX set
  `parserOptions.ecmaFeatures.jsx`.
- The outermost `describe` is the default export's name (camelCase). Divide with `// ----- 正常系 -----` /
  `// ----- 異常系 -----`, run `ruleTester.run` once per `it`, each holding only one of `valid` or
  `invalid`. Match errors by `messageId`.
- Rules that judge by location are exercised by passing `filename`. Declarations such as connection points
  are imported from `architecture.ts` and run through, without holding a copy.
- The code under test is passed as a string, so code containing template syntax is built in pieces, as in
  `["…`$", "{x}`…"].join("")`.
- Tests of rules that resolve to real files use modules that actually exist in the repository as fixtures
  (so the declarations are read, without creating a copy). If a fixture module moves, the test fails, so
  write the reason it was chosen (declares the classification / does not / only the next level declares it)
  in the constant's comment.

### Perspectives to pin

Each rule's `invalid` holds the violating shapes, and `valid` holds the following. A "not looked at" line
becomes intent only when a test pins it on the valid side.

- Forms whose spelling is not statically decided (variables, expressions, computed keys, dynamic spellings)
- Different functions sharing only the name, non-call references, and calls whose name is decided by an expression
- Non-string literals (numbers, booleans, `null`, regular expressions)
- For location-judging rules, a neighboring area that matches only the prefix, and a `filename` passed as an absolute path
- For module-level rules, forms written before the declaration, and declarations inside functions (on the `invalid` side)
- Kinds excluded from scope (tests, `use cache: private`, type-only imports)

## Adding a rule

1. First confirm that biome cannot express it. Adding to the ESLint side something biome can express is
   forbidden by [0002](../docs/adr/0002-formatter-linter.md); write the result of the check in the PR body.
2. Decide the convention's owner. If neither a section of `docs/rules.md` nor a layer README owns it yet,
   write it there first. The rule's leading comment names that owner, and the owner's "enforced via" names
   `project-rules/<rule-name>`.
3. Default-export a `Rule.RuleModule` from `eslint-rules/<rule-name>.ts`. `meta.type` is `"problem"`,
   `docs.description` is one sentence, and `messages` are in Japanese, each messageId carrying the three
   things above. Read placement declarations from `architecture.ts`.
4. Place a `.test.ts` of the same name next to it, pinning the perspectives above.
5. Register it in the `project-rules` plugin in [`eslint.config.ts`](../eslint.config.ts) and set it to
   `"error"` in the `src/**` block. If exclusion by kind of target is needed, add a separate block with
   `files` / `ignores` and write the reason there.

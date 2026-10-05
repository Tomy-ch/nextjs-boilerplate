# token scripts

`tokens/scripts/` is responsible for generating CSS and TypeScript constants from the token SSOT and for checking that the generated artifacts match it.

## Files

- `gen-tokens.ts`: generates three files from `primitives.json` and `themes/<family>/<color-scheme>.json` — `src/app/generated/tokens.css`, plus `breakpoint.ts` / `design-token.ts` under `src/model/generated/` — and with `--check` checks all three for differences
- `gen-tokens.test.ts`: verifies the contract of the generated CSS and TypeScript

## Running

```sh
pnpm gen:tokens
pnpm check:tokens
```

The former updates the tracked generated artifacts. When you change a token, include the generated artifacts in the same change. The latter also runs in CI and fails any change whose generated artifacts do not match the SSOT.

# Publishing the Mock App (Exclusion)

This ADR records, as a deliberate exclusion, that the app running against mocks generated from the contract (the mock app) is **not held as a public surface**, and states the conditions for reversing that.

The mock app is not a separate app. The mock app is the same app started with `APP_API_MODE=mock`, and it adds no build output. That the build passes without a backend, and that it starts and returns responses, is checked by CI's startup check, and verification through screens (e2e / baseline image comparison) also rides on this form. **As a foundation for verification it is bundled in the core. What is not done is making it a surface to show people.**

## Status

Accepted (exclusion)

## Context

This repository publishes two surfaces, and both are **this repository's documentation** — the component catalog (Storybook; [0054](0054-ui-catalog-storybook.md)) and the portal that bundles the READMEs ([0141](0141-portal-operations.md)). They are served from one static site, side by side on sibling paths.

The mock app is neither. It does not explain anything to a reader; it is a foundation for running screens all the way through for verification. Its contents are values generated from the contract and do not depict any real business. The value ranges are named in configuration so that screens can be checked with those values, not to make them look plausible.

A use-case-dependent "not doing it" judgment, if left unspoken, leaves no trace that the line was drawn consciously. Like i18n ([0121](0121-i18n-strategy.md)) / PWA ([0130](0130-pwa-strategy.md)), publishing the mock app is also made explicit as an exclusion.

## Decision: Do Not Hold the Mock App as a Public Surface

- **The mock app is not made a public surface alongside Storybook / the portal.** No mock app tenant is added to the serving site, and no URL is handed out as a demo
- **The reason is that the moment it is published, it becomes a demo.** People who see it read it as a sample of the product. But its contents are values generated from the contract, and there is no party responsible for updating them. Something not in a position to show readers anything would be permanently placed alongside things that are
- **The mock app works fully only in environments where development-only endpoints are open.** Without the endpoint that issues a session without going through the IdP, protected screens cannot be reached. That endpoint opens only in `local` / `ci`, and [0011](0011-no-docker.md) already forbids putting only the frontend in the cloud with mocks still in place. Making it a public surface would mean either breaking that prohibition or giving up the screens that need authentication
- **Bundling as a foundation for verification does not change.** CI's startup check, e2e and baseline image comparison keep running on top of the mock app. The target of the exclusion is "publishing", not "bundling"

**Rejected: publish it as a permanent demo.** The proposal to provide a place where screens can be touched as this repository's sample. If samples are needed, the catalog already holds components, and stories wrapped in the same layout shell as the route already hold whole screens ([0054](0054-ui-catalog-storybook.md)). Standing up a separate touchable sample would double the authority for what is shown there with the stories.

**Rejected: house the mock app inside Storybook.** The catalog is a surface without a server, a place to show components with Server Actions and Route Handlers swapped out ([0054](0054-ui-catalog-storybook.md)). Putting the app's routes on it wholesale would break the premise of swapping, and it would become unclear what the catalog is a place to show.

## Reversal Conditions

It tips toward publishing **when the mock app itself comes to be in a position to show readers something** — for example, when it is decided to use it as a surface that shows screen specifications. At that point the following two must be decided together.

- **What surface it is.** A sample of the specification, or a place to show the feel of interaction. Publishing without deciding what it shows lets viewers assign meaning on their own
- **Who is responsible for updates.** When the contract changes, the generated artifacts change automatically, but "whether what it shows is correct" is not guaranteed by generation. Without a party holding that responsibility, it cannot stand in the position of showing

When the conditions are met, its place is a sibling path of the serving site ([0141](0141-portal-operations.md)). Even then the prohibition of [0011](0011-no-docker.md) remains — a published mock app is a build with the development-only endpoints closed, and how to let people reach screens that need authentication has to be decided separately.

## Handling Exclusions

- This ADR is a record of an "intentionally not doing it" judgment (the taxonomy of [0140](0140-documentation-operations.md): exclusion = ADR). If you publish the mock app on your own judgment, this exclusion is no obstacle

## Prohibitions

- ❌ Adding a mock app tenant to the serving site, or handing out the mock app's URL as a demo (until the reversal conditions are met) (Enforcement: none — a decision not to adopt. The serving site has no mock app tenant; adding one shows up in the diff of how serving is assembled)
- ❌ Pointing to the mock app as a "sample" from READMEs or the portal (samples are held by Storybook stories; [0054](0054-ui-catalog-storybook.md)) (Enforcement: Prose — **not mechanizable**. Whether something is pointing to it is decided by the meaning of the sentence, not by the shape of the link)
- ❌ Placing, for publication, a build with the development-only endpoints still open anywhere other than a local destination ([0011](0011-no-docker.md) / [0113](0113-development-access-surface.md)) (Enforcement: Prose — **not mechanizable**. Where a build is placed is decided by the deployment operation and does not appear in code (closing the endpoints where it is placed is 0113's runtime check))

## Related ADRs

- [0054-ui-catalog-storybook.md](0054-ui-catalog-storybook.md) — one of the public surfaces (the component catalog). Stories also hold whole-screen samples
- [0141-portal-operations.md](0141-portal-operations.md) — one of the public surfaces (the README portal), and the composition of the serving site
- [0011-no-docker.md](0011-no-docker.md) — not putting only the frontend in the cloud with mocks in place; the definition of environments where development-only endpoints open
- [0113-development-access-surface.md](0113-development-access-surface.md) — development-only endpoints closing both at build time and at runtime
- [0090-testing-strategy.md](0090-testing-strategy.md) / [0091-test-verification-methods.md](0091-test-verification-methods.md) — the verification that runs on top of the mock app
- [0121-i18n-strategy.md](0121-i18n-strategy.md) / [0130-pwa-strategy.md](0130-pwa-strategy.md) — the same kind of judgment, recording a use-case dependency as an exclusion

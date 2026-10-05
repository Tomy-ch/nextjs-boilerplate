# `(site-info)` Outer Frame (Screen Requirements)

> Functional requirements are in [`layout.function.md`](layout.function.md).

The layout shell that wraps the site information. It consists of a header, the body and a footer.

## header

| Region | Contents |
| --- | --- |
| Site name | A path to the top page |
| nav | Products / Purchase history / My Page |

**Make it look the same as the user-facing outer frame.** The layout shells are separate for reasons of rendering time, and to users it
must look like a continuation of the same site.

**Only the cart entry point is missing.** The reason is held by [`layout.function.md`](layout.function.md).

## Beside the Body

None. This layout shell has nothing to show beside it.

## footer

One sentence on what this repository is, and a path to the repository (the same as `(shop)`).

## Breadcrumbs

None. Every page beneath it is a single page with no hierarchy.

## Related

- Implementation `src/app/(site-info)/layout.tsx` / `src/features/site-info/` — [README](../../../../src/features/site-info/README.md)

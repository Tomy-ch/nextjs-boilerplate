# Specifications

These documents record **what the implementation promises**. The goal is that the same screen can be rebuilt from the specifications
alone.

## Split in Two

For each screen, functional requirements and screen requirements go in separate files. Mixed together, what the contract decides and
design judgments cannot be told apart, and one cannot be replaced without the other.

The split is decided by this question.

> **Could there be a screen with the same backend contract and the same user goal, where only this statement differs?**
> If it could → screen requirement. If it could not → functional requirement.

| | Functional requirements (`*.function.md`) | Screen requirements (`*.screen.md`) |
| --- | --- | --- |
| Subject | What can be done | How it looks |
| Examples | Values are sent as the result, not as a diff / without at least one target, it cannot advance to the next step / a fetch failure affects the whole screen | When the limit is reached, the control that increases the value cannot be pressed / below `lg`, the summary comes out from the bottom of the screen / a failure is shown next to that control |

## Where They Go

**They mirror the `src/app` hierarchy as is.** A directory is created per route, and the specification of each corresponding
file goes inside it. There is no need to think about placement, and layout promises get a place too.

| Implementation | Specification |
| --- | --- |
| `layout.tsx` (root) | `route/layout.{screen,function}.md` |
| `page.tsx` (root) | `route/page.{screen,function}.md` |
| `<segment>/page.tsx` | `route/<segment>/page.{screen,function}.md` |
| `(group)/layout.tsx` | `route/<group>/layout.{screen,function}.md` |
| `(group)/<segment>/page.tsx` | `route/<group>/<segment>/page.{screen,function}.md` |
| `(group)/<segment>/<child>/page.tsx` | `route/<group>/<segment>/<child>/page.{screen,function}.md` |
| `(group)/<segment>/[id]/page.tsx` | `route/<group>/<segment>/[id]/page.{screen,function}.md` |

A route group does not appear in the URL, so it is placed under the name with the parentheses removed (`(group)` → `<group>/`). A dynamic
segment appears in the URL, so it is placed under the name with the square brackets kept.

**Parallel route slots (`@slot/`) have no place of their own.** They do not appear in the URL and are not independent screens,
so their promises are held by the specification of the screen the slot is inserted into (the promises of `<group>/@slot/<segment>/page.tsx` go in
`route/<group>/<segment>/page.screen.md`).

**Development-only routes have specifications too.** `page.dev.tsx` is excluded from the build
([0113](../adr/0113-development-access-surface.md)), but **being excluded from the build and having no promises are
different things**. Placement is mirrored the same way as the others.

**A layout's specification applies to everything beneath it.** Promises that span screens (state the outer frame supplies, how authentication is handled,
effects on render timing) are written once in the upper `layout.*.md`, and each screen writes its difference from there.

**A screen with no functional requirements gets no `page.function.md`.** An empty file erases the distinction between "not written
yet" and "there is none".

## Screens Written So Far

| Route | Specification |
| --- | --- |
| Root outer frame | [`layout.screen.md`](route/layout.screen.md) / [`layout.function.md`](route/layout.function.md) |
| `(shop)` outer frame | [`layout.screen.md`](route/shop/layout.screen.md) / [`layout.function.md`](route/shop/layout.function.md) <!-- sample:line --> |
| `/` | [`screen`](route/shop/page.screen.md) / [`function`](route/shop/page.function.md) <!-- sample:line --> |
| `/products` | [`screen`](route/shop/products/page.screen.md) / [`function`](route/shop/products/page.function.md) <!-- sample:line --> |
| `/products/[id]` | [`screen`](<route/shop/products/[id]/page.screen.md>) / [`function`](<route/shop/products/[id]/page.function.md>) <!-- sample:line --> |
| `/cart` | [`screen`](route/shop/cart/page.screen.md) / [`function`](route/shop/cart/page.function.md) <!-- sample:line --> |
| `/checkout` | [`screen`](route/shop/checkout/page.screen.md) / [`function`](route/shop/checkout/page.function.md) <!-- sample:line --> |
| `/checkout/complete` | [`screen`](route/shop/checkout/complete/page.screen.md) / [`function`](route/shop/checkout/complete/page.function.md) <!-- sample:line --> |
| `/purchases` | [`screen`](route/shop/purchases/page.screen.md) / [`function`](route/shop/purchases/page.function.md) <!-- sample:line --> |
| `/purchases/[code]` | [`screen`](<route/shop/purchases/[code]/page.screen.md>) / [`function`](<route/shop/purchases/[code]/page.function.md>) <!-- sample:line --> |
| `/mypage` | [`screen`](route/shop/mypage/page.screen.md) / [`function`](route/shop/mypage/page.function.md) <!-- sample:line --> |
| `/mypage/edit` | [`screen`](route/shop/mypage/edit/page.screen.md) / [`function`](route/shop/mypage/edit/page.function.md) <!-- sample:line --> |
| `/mypage/inquiry` | [`screen`](route/shop/mypage/inquiry/page.screen.md) / [`function`](route/shop/mypage/inquiry/page.function.md) <!-- sample:line --> |
| `(site-info)` outer frame | [`layout.screen.md`](route/site-info/layout.screen.md) / [`layout.function.md`](route/site-info/layout.function.md) <!-- sample:line --> |
| `/about` | [`screen`](route/site-info/about/page.screen.md) / [`function`](route/site-info/about/page.function.md) <!-- sample:line --> |
| `/privacy` | [`screen`](route/site-info/privacy/page.screen.md) / [`function`](route/site-info/privacy/page.function.md) <!-- sample:line --> |
| `/terms` | [`screen`](route/site-info/terms/page.screen.md) / [`function`](route/site-info/terms/page.function.md) <!-- sample:line --> |
| `admin` outer frame | [`screen`](route/admin/layout.screen.md) / [`function`](route/admin/layout.function.md) <!-- sample:line --> |
| `/admin` | [`screen`](route/admin/page.screen.md) / [`function`](route/admin/page.function.md) <!-- sample:line --> |
| `/admin/analytics` | [`screen`](route/admin/analytics/page.screen.md) / [`function`](route/admin/analytics/page.function.md) <!-- sample:line --> |
| `/admin/products` | [`screen`](route/admin/products/page.screen.md) / [`function`](route/admin/products/page.function.md) <!-- sample:line --> |
| `/admin/products/new` | [`screen`](route/admin/products/new/page.screen.md) / [`function`](route/admin/products/new/page.function.md) <!-- sample:line --> |
| `/admin/products/[id]/edit` | [`screen`](<route/admin/products/[id]/edit/page.screen.md>) / [`function`](<route/admin/products/[id]/edit/page.function.md>) <!-- sample:line --> |
| `/admin/products/[id]/stock` | [`screen`](<route/admin/products/[id]/stock/page.screen.md>) / [`function`](<route/admin/products/[id]/stock/page.function.md>) <!-- sample:line --> |
| `/admin/inquiries` | [`screen`](route/admin/inquiries/page.screen.md) / [`function`](route/admin/inquiries/page.function.md) <!-- sample:line --> |
| `/admin/inquiries/[inquiryId]` | [`screen`](<route/admin/inquiries/[inquiryId]/page.screen.md>) / [`function`](<route/admin/inquiries/[inquiryId]/page.function.md>) <!-- sample:line --> |
| `/admin/shipments` | [`screen`](route/admin/shipments/page.screen.md) / [`function`](route/admin/shipments/page.function.md) <!-- sample:line --> |
| `/admin/users` | [`screen`](route/admin/users/page.screen.md) / [`function`](route/admin/users/page.function.md) <!-- sample:line --> |
| `auth` outer frame | [`screen`](route/auth/layout.screen.md) |
| `/login` | [`screen`](route/auth/login/page.screen.md) / [`function`](route/auth/login/page.function.md) |
| `/onboarding` | [`screen`](route/auth/onboarding/page.screen.md) / [`function`](route/auth/onboarding/page.function.md) <!-- sample:line --> |
| `/dev/session` | [`screen`](route/dev/session/page.screen.md) / [`function`](route/dev/session/page.function.md) |
| `/maintenance` | [`screen`](route/maintenance/page.screen.md) / [`function`](route/maintenance/page.function.md) |
<!-- sample:replace-begin -->
<!-- sample:replace-with -->
<!-- = | `/` | `route/page.screen.md` |-->
<!-- sample:replace-end -->

**This inventory is the list of screens.** The promises of screens are held here, and no other document holds them in its place
([0143](../adr/0143-spec-driven-development.md)).

**Settling the specification first is not required.** It can be written only after the look is settled, so in the order of screen implementation
([`playbook.md`](../playbook.md)) it comes after the story review passes. However,
**a route left without a specification is a hole to fill, not a normal state.**
The routes in `src/app` and this inventory are reconciled by machine ([`scripts/spec-routes.gate.test.ts`](../../scripts/spec-routes.gate.test.ts)).

## Section Vocabulary

**Sections on the same subject are written under the same heading on every screen.** With aligned headings, the same promise on two screens
can be read side by side, and a section missing from only one of them stands out. A subject that does not fit the vocabulary below
gets a heading specific to that screen. The vocabulary itself is not reworded per screen.

| Heading | Side it goes on | What to write |
| --- | --- | --- |
| `What It Shows` | Screen requirements | What is shown, in what order. The screen skeleton |
| `Loading` / `Empty State` / `How Failure Looks` | Screen requirements | How each state looks. What appears where, and what remains |
| `Responsive Layout` | Screen requirements | How the skeleton changes by band (`lg` and up / below, etc.) |
| `Breadcrumbs` | Screen requirements | How the hierarchy is shown, and where you can go back to |
| `Checking in the Catalog` | Screen requirements | Premises for checking in Storybook. Responses replaced inside the story, etc. |
| `Actor and Ownership` | Functional requirements | Whose what it handles, and which judgments the backend holds |
| `Fetching` | Functional requirements | What is fetched in how many streams, and what can change on each fetch |
| `Failures` | Functional requirements | For each failure, how far it reaches and which boundary receives it |
| `Authorization` | Functional requirements | Who can enter, and where they are sent when they cannot |
| `Submission` | Functional requirements | What is sent, and what happens when it succeeds |
| `Related` | Both | The implementation's README, the upper layout's specification, where it leads and where it returns. **Placed as the last section** |

## What Not to Write

A specification **only points at** the following five, and does not copy them. Copying means a fix has to be reflected
in two places.

| Points at | What it holds |
| --- | --- |
| `openapi/<name>.gen.yaml` ([`openapi/README.md`](../../openapi/README.md)) | The contract (types, errors, limits) |
| `tokens/primitives.json` | Values (tier widths, etc.) |
| [`rules.md`](../rules.md) | Rules enforced day to day |
| `components/**/README.md` + Storybook | Component vocabulary |
| [`adr/`](../adr/) | The choice of mechanisms, and the reasons |
| [`glossary.md`](glossary.md) | **Screen-side terms not in the contract**, used in specification prose |

So the following are not written in a specification.

- **Component names.** Write as far as "put the summary and the path forward into one container", and do not write which component is used.
  Writing component names would allow regeneration but rots with every rename
- **Numbers with units.** Tiers are written by name, such as `lg` and up / below `lg`
- **Rules that span layers.** "The sidebar is shown only at `lg` and up" is a rule, not a specification of an individual
  screen
- **Implementation procedures.** The code holds them
- **Operations not specific to a screen.** The feature's README holds them

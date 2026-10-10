# Root Outer Frame (Functional Requirements)

> Screen requirements: [`layout.screen.md`](layout.screen.md).
>
> What is written here are **promises that apply to every screen**. Each route group's promises are held by its
> `layout.*.md`, and each screen's by its `page.*.md`.

This layout shell belongs to no route group. It holds the supply of fonts, instrumentation, cross-cutting notifications, and consent.

## Two consent categories

Consent is asked as a binary: "what is needed to display the screen" and "what the screen works without". Finer categories depend on
the products connected and the jurisdiction, so they are not decided in advance while nothing is connected
([0131](../../adr/0131-cookie-consent.md)).

**What is needed is not asked about.** If asked and refused, the screen would not work, so presenting it as an option would be a lie.

## Keep asking until a choice is made

It asks only when "the consent state has been read and nothing has been chosen yet".

**No way to finish without choosing.** Neither a close action, Escape, nor clicking outside the panel ends it. If it could be ended,
an "asked but not chosen" state would remain, and the same panel would appear on the next visit. To the user it only multiplies
things that will not go away; to this side, whether consent was given is never settled.

**While asking, the background cannot be operated.** This keeps what can be operated the same for people who see the screen and people
who use a screen reader.

## Consent stays in a cookie and can be read on the server side

The chosen intent is put in a cookie with a validity period. **It is not indefinite** — otherwise screens whose connected products and
wording have changed would run on intent from years ago.

**The version of the wording that was asked is stored along with the intent; if it differs from the current version, it is treated as
not chosen.** With expiry alone, intent given to the old wording keeps taking effect even after the wording is rewritten — what was
consented to has changed, but the consent remains. Attaching the version means everyone can be asked again the moment the wording is
rewritten. The condition is that **whoever rewrites the wording bumps the version**; forgetting to bump it leaves in effect the consent
of users who have not seen the new wording.

**Reading happens on the browser side.** Consent applies to every screen, so the only place to read it is the root layout. Reading it
there on the server side would make **that read a dynamic hole shared by every screen, dropping even screens currently delivered fully
static into ones with dynamic holes** ([0041](../../adr/0041-cache-components-decision.md)). It would change how screens unrelated to
consent are delivered, just for the consent panel. As a consequence of this choice, **the panel appears after the browser finishes
reading**.

The pre-check (`src/proxy.ts`) reads the same cookie on the server side. Even with two readers, one place (`src/model/consent.ts`)
holds the spelling and the interpretation.

## Screens are wrapped in one layout shell, with cross-cutting notifications outside it

While open, the asking panel hides the background from assistive technology the whole time.

**The screen body is wrapped in one element rendered by this layer.** This keeps the marker attached to the background from rewriting
elements that have not yet hydrated and causing a mismatch. The reason, and the basis for not delaying it with a timer, are held by
[0026](../../adr/0026-layout-shell-mount.md) and [rendering.md](../../design/rendering.md#hydration-mismatches-are-not-accidental)'s
"Hydration mismatches are not accidental".

**Cross-cutting notifications are placed outside this layout shell.** A continuously announced region (`aria-live`) is not hidden even
when the background is hidden. Putting notifications inside the layout shell would prevent hiding the whole layout shell, defeating the
point of wrapping it.

## Load nothing without consent

Assets that require consent **do not have their elements placed at all** until consent is obtained.

**What has been placed cannot necessarily be removed later.** In deployments that add a way to withdraw consent, **withdrawal takes
effect from the next load**. What the gate protects is the "not yet loaded" side, not the "unload what was loaded" side.

**A tag manager sits behind the gate** ([0131](../../adr/0131-cookie-consent.md)). It loads only in deployments that declare a container
ID, and if empty, its element itself is not rendered. **Empty is not "unset" but a specification to "not load"**, and this is the lever
that removes the dependency on Google.

This path does not go through the relay; it goes directly from the browser to the distribution origin (the sole exception to what
[0082](../../adr/0082-client-observability.md) prohibits; the reason is in [0131](../../adr/0131-cookie-consent.md)). In deployments
that declare a container ID, the delivery headers also change to allow Google's origin ([0111](../../adr/0111-csp-security-headers.md)).

**Operational instrumentation does not pass through the gate.** Failure and performance measurement are kept distinct from behavior
tracking ([0082](../../adr/0082-client-observability.md)). If jurisdictional requirements make these subject to consent too, the same
predicate is reused.

## The measurement id is issued only behind consent

An identifier linking visits from the same browser is issued **only while consent is in place**. Issuing it before consent would mean
handing out the identifier and then asking for consent.

- The pre-check issues it, matching it against the consent state on every request
- If already issued, it is not recreated. An identifier that changes per request cannot link visits
- **When consent is withdrawn, it is deleted.** Expiry, deletion by the user, and choosing again are all treated the same
- It is issued from the request after the one where consent was pressed, not immediately

## Related

- Implementation: `src/app/layout.tsx` / `src/app/consent.tsx` / `src/proxy.ts`
- Shape of the supply: [0031](../../adr/0031-policy-state-supply.md) / mount position: [0026](../../adr/0026-layout-shell-mount.md)

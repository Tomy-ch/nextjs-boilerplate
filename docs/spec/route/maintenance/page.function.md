# `/maintenance` Under Maintenance (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Rendering

**Fixed at build time.** It has no fetching, and its content changes only when the code is rewritten
([0041](../../../adr/0041-cache-components-decision.md)). **It does not read whether the service is stopped either**
— reading it would stop this screen from serving a static shell. The entry point owns that decision.

## When the Screen Is Swapped In

While the app runs with `APP_MAINTENANCE_MODE=on`, the entry point (`src/proxy.ts`) rewrites every request that
passes its filter to this route ([0043](../../../adr/0043-middleware-policy.md)).

- **Only reads (`GET` / `HEAD`) are swapped.** Everything else is not swapped and is refused with 503 (below)
- **The URL does not move.** This is a rewrite, not a redirect, so opening the same URL after recovery returns to the original screen
- **It does not proceed to the authorization pre-check.** If authorization were checked first while stopped, only
  unauthenticated requests would be sent to login, and whether the service is stopped would be visible or not depending on the path

## Requests that change state are refused, not swapped

**Swapping only changes what is rendered; the request itself still flows to the later stages.** The method, the body and the `Next-Action`
header are unchanged, so telling the requester that the service is stopped is not the swap's job. Therefore
anything other than a read is not rewritten; the entry point refuses it with 503.

The framework does not promise how a Server Action is handled on a swapped request. **Nor is it something this
mechanism promised.** Depending on how it is handled would silently open the door the day that changes.

**Even when not stopped, it opens by URL.** Since it holds no decision, opening `/maintenance` directly shows this
screen. Closing that would require the screen itself to read the stop decision, which would make every route
dynamic while stopped. What opens is only fixed text, so the side that drops the decision is not adopted.

## The maintenance screen responds with 200

**A rewrite does not carry a status.** A status attached to the swap is not read, and the response is the result of
rendering the swap target. **Therefore the response that renders the maintenance screen is 200** (a request refused rather than swapped gets 503, above).

This is not a judgment that "503 is unnecessary." **The presentation layer has no way to return 503**, and a
deployment that wants to tell machines it is stopped **puts its delivery surface (CDN / load balancer) in front**
(the division of roles in [0011](../../../adr/0011-no-docker.md)). Stopping there means nothing reaches Next.js,
so it does not conflict with this mechanism.

If the proxy assembled the whole body it could return 503, but that body would be an HTML string inside the proxy, and
a screen built on the design system could not be shown. **Do not give up the screen for the sake of a status.**

`Retry-After` is not set even where it could be. There is no endpoint that supplies the scheduled end, so it would
carry a baseless value.

## Paths that pass even while stopped

| Path | Reason |
| --- | --- |
| Static assets (`_next/static` / `_next/image` / `favicon.ico`) | Stopping them would leave this screen unable to fetch its own assets. The entry point's filter already excludes them |
| `/api/health` | External monitoring could no longer tell a planned stop from an outage |
| `/maintenance` | Making the swap target subject to the swap would make the rewrite point at itself |
| Metadata deliverables (`icon` / `apple-icon` / `opengraph-image` / `sitemap.xml` / `robots.txt`) | Deliverables anyone can open, which the entry point's filter already excludes. The original content is returned even while stopped |

## Switching

**A restart is required.** ENV is read into the process once and the same evaluated result is served from then on
([`src/config/README.md`](../../../../src/config/README.md)). Both stopping and resuming are operations that change the
deployment target's environment settings and restart it; there is no endpoint that applies it to a running process.

## Authorization

**Not protected.** That the service is stopped means nothing unless it can be read before logging in.

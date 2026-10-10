# `/admin` Outer Frame (Functional Requirements)

> Screen requirements: [`layout.screen.md`](layout.screen.md).
>
> What is written here are **promises that apply to every screen beneath it**. Each screen's own are held by its `page.*.md`.

## Who can enter

**Only actors with the admin role can enter.** Neither unauthenticated actors nor authenticated actors without the role can enter.

The canonical source of roles is the backend, not the IdP. The IdP holds only identity; what an actor may do is business-side
data ([0070](../../../adr/0070-backend-role-separation.md) / [0079](../../../adr/0079-auth-frontend-seam.md)).

**One place declares which role each route requires.** If the pre-check and the definitive authorization each hold their own
conditions, there is no telling which is right when the two disagree.

## Stopping in two stages

| Stage | What it does | What it does not do |
| --- | --- | --- |
| Pre-check | Reads only the cookie session and sends the request back before it arrives | Does not consult the data source |
| Definitive authorization | Verifies the session and checks the role before building the content | Does not trust the pre-check's result |

**The pre-check is not a line of defense.** It is a check that only reads a cookie, and any path that does not go through it is
simply a hole. The line of defense is on the definitive authorization side ([0043](../../../adr/0043-middleware-policy.md)).

**The definitive authorization does not assume the pre-check let the request through.** A request may arrive without passing the
pre-check, so the same check is made again.

## Where to send actors who cannot enter

| State | Destination | Reason |
| --- | --- | --- |
| Unauthenticated | Login (carrying the original destination) | Retrying gets them in |
| Insufficient role | The site's top page | Retrying gives the same result |

**Do not tell the user on screen that the role is insufficient.** Links into admin are never shown in the first place, so a
request that reaches here hit the URL directly. Answering whether the actor has permission only reveals that the page exists.

**Sending to login with the original destination is the pre-check's job.** The definitive authorization (layout shell) does not
receive the current URL, so a request that arrived without passing the pre-check is sent back to the site's top page whether it
is unauthenticated or lacks the role. The definitive authorization is a safety net behind the pre-check, and promises only that
actors who cannot enter are not let in.

## The side that shows the link

**Actors without the role are not shown the entry into admin at all.** Showing it and refusing at the destination tells everyone
that an admin area exists. Whether to show it uses the same predicate as the definitive authorization
([`shop/layout.function.md`](../shop/layout.function.md)).

## Keep out of search indexes

Screens beneath this are not to be picked up by search engines. They sit behind authorization and cannot be reached from an
index, and only their existence would leak out ([0044](../../../adr/0044-seo-metadata-strategy.md)).

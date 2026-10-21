# `/login` Login (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).

Where authentication starts. **This screen does not verify credentials.** Only the backend can verify them; what this repository can
hold is the relay ([0079](../../../../adr/0079-auth-frontend-seam.md)).

> **The current implementation also delegates credential entry to the authentication provider's screen.** This is the borrowed-screen
> path that the same ADR allows only for federation, taken because the default Resolver has that shape. The same ADR's goal is
> **for `/login` to own the input surface**; this document describes the state before that. Even once input fields arrive, not
> verifying, and the promises below on what is received, indexing and the boundary, do not change.

## Actor and Ownership

**Anyone can enter.** An actor bounced from a protected screen and an actor who opened this URL themselves see the same screen. This
is not a screen that decides whether one may enter.

**No account is created.** First-time users also complete authentication here.

<!-- sample:begin -->
After authentication, the registration screen creates the registration information. Authentication and registration are separate
states; the former is resolved only here, the latter only in registration.

The functional requirements on the registration side are [`/onboarding`](../onboarding/page.function.md).
<!-- sample:end -->

## What It Receives

Two values are read from the URL. **Both are validated before being passed to the screen.** Bringing validation onto the screen side
would make the screen a place that behaves on the basis of the URL's contents.

| Value | Use | When it fails |
| --- | --- | --- |
| Return destination | Where to return after authentication | Unless it is a same-origin relative path, fall back to the starting point (`/`) |
| Reason | A notice about why the user was sent back to this screen | For an undeclared value, a repeated value, or none, show no notice |

**Unknown reasons get no notice.** Users can edit the URL directly, so changing the screen on the basis of the string in it would be a
way to make it show arbitrary text.

**Only the validated return destination is carried around.** Placing the received value as is would let the site's own links send
users to an external URL (open redirect). Validation is done once, at the entry point.

## Starting Authentication

**Starting is an operation that creates state.** Building the authorization request and storing the temporary state its round trip
needs belong to the receiving endpoint; this screen only passes the return destination to it. The temporary state's content is
determined by the authentication method, and the method is closed behind the replacement endpoint
([0079](../../../../adr/0079-auth-frontend-seam.md)).

**Therefore it is not a link.** As a link, prefetching would **start authentication without the user pressing anything**.

**When it could not start, return to this screen carrying the reason.** Failing to reach the authentication provider cannot be fixed
by the user's input, so only the classification is carried; neither the body the IdP returned nor where it failed is included.

## Search Indexing

**Not to be picked up by search engines.** The return destination is received in the URL, so the same screen would be indexed as a
separate URL for every return destination, none of which means anything on its own.

<!-- sample:begin -->
## The Boundary between Authentication and Registration

| State | Where it is resolved |
| --- | --- |
| Not authenticated | This screen (sends the user out to the authentication provider) |
| Authenticated, but no user record yet | The registration screen |

**The email address the registration screen receives is a contact address, not the authentication identity.** The registration side
explains, at the field, that the boundary is cut here.

The other side of the boundary is [`/onboarding`'s functional requirements](../onboarding/page.function.md) and [screen requirements](../onboarding/page.screen.md).
<!-- sample:end -->

## Related

- Implementation: `src/features/auth/`
- Receiving endpoint: `src/app/api/auth/`

# `/terms` Terms of Use (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

A screen that holds the conditions for viewing and using the site, and the disclaimer.

## Start from the risk of viewing itself

**The main risk of this site exists regardless of whether the user does anything.** A format that starts from prohibited
actions does not convey that, so the top states "viewing the site counts as agreeing", followed by the
security assumptions.

| Section | Contents |
| --- | --- |
| (Opening) | That viewing counts as consent |
| About security | That the configuration is public, and that users are not contacted in case of unauthorized access |
| About the information you enter | To use fake names. A path to the privacy policy |
| About the service | That it may be stopped, changed or wiped entirely without notice. That purchases and payments never go through. A path to the screen that says what does not work |
| What we ask you not to do | Probing for vulnerabilities, overloading, automated bulk requests, collecting other people's input |
| Disclaimer | That it is provided as is, and that no liability is accepted for damages |

## How to Write About Security

The danger is not being public itself but that **no special customization is done**. General best practices,
including placing a WAF, are followed, but because even the configuration values are public and nothing is built individually, attacks are
relatively easier than against a company's site — write along that line.

Write the place where the configuration is published as "planned to be published in the future as samples of a series of boilerplates". **Do not name
a repository that does not exist yet.**

State clearly that users and viewers are not contacted even if unauthorized access or a database intrusion occurs.

## Only this screen holds the disclaimer

It is not placed on [`/about`](../about/page.screen.md). Putting the same text in two places makes it possible to end up with only one of them fixed.

## Entry Paths

The caveat on the top page (`SampleNotice` in `features/home`) points to this screen at its very start. **Since viewing counts as
consent, the user must reach what they are consenting to first; a position that cannot be reached without scrolling down to the footer
does not hold.**

## Related

- Implementation `src/features/site-info/terms/` — [README](../../../../../src/features/site-info/README.md)
- [`/about`](../about/page.screen.md) / [`/privacy`](../privacy/page.screen.md)

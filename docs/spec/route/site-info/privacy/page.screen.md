# `/privacy` Privacy Policy (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

A screen that explains where the information you enter is kept.

## Do not use the usual format

**Where data is stored changes three ways depending on how the site is running.** With stock wording, users
cannot tell which case applies to them.

| How it is running | Where data is stored |
| --- | --- |
| You cloned it yourself and connected it to the Go side | Your own local database. Nothing is sent outside |
| You cloned it yourself and left it on mocks | **Stored nowhere**. Responses are assembled on the spot by a mock generated from the contract |
| The public sample site | **A database for the sample**. Encryption, access restriction and retention-period management are not provided |

## Put the warning asking for fake names first

Written after the three explanations, it would come after the user has already entered something. Put it at the top as a `destructive` warning,
asking users to enter values that do not exist for their name, address, phone number and email address.

## Everything Else

State that no tracking (analytics, advertising) is done, and that nothing is provided to third parties.

## Related

- Implementation `src/features/site-info/privacy/` — [README](../../../../../src/features/site-info/README.md)
- [`/terms`](../terms/page.screen.md) holds the consent conditions and the disclaimer

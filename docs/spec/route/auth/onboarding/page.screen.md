# `/onboarding` Registration (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).

A screen that creates registration information on first use. It sits in the authentication layout shell ([`layout.screen.md`](../layout.screen.md)).
Before arriving here, the user has completed authentication at [`/login`](../login/page.screen.md).

## What It Shows

Nine fields split into three steps, showing only one step at a time.

| Step | Fields |
| --- | --- |
| Basic information | Family name, given name (side by side), email address, phone number |
| Address | Postal code (with the address lookup action bundled), prefecture, city, district and street number, building name |
| Confirmation | Reading back the values about to be sent |

**They are split because there is no reason to show nine fields at once.** First-time input needs "how much more until I can send",
which the progress indicator shows.

Required and optional markers are placed before the label. The markers are hidden from assistive technology, and the control conveys
that the field is required.

**The email address gets a supplementary note.** The user arrives at this screen right after completing authentication, so it could be
read as if the address entered here can be used to log in. The field states that it is an address for contact, not the authentication
identity. Only this field gets a note; the other fields can be read from their names.

Prefecture is a plain select. The options are static and fixed in number, so there is no reason to bring in a searchable client island.

## Progress

The sequence of steps and the current position are laid out horizontally above the input fields. Stacking them vertically lengthens
the area above the input fields by the number of steps, and the user has to scroll before starting to type.

**Any step reached at least once can be returned to directly from the progress indicator.** Going from confirmation to fix one thing
takes the shortest path. Steps not yet reached cannot be pressed.

## The Forward Action

**Next cannot be pressed until the current step is filled in.** Proceeding from an unfilled step means discovering the gap only right
before sending.

**Error messages are shown under a different condition.** They appear when focus leaves, and while focus is on the field they only act
in the direction of hiding the display ([0062](../../../../adr/0062-form-input-validation.md)). Turning every empty field red right
after opening tells someone who has done nothing yet that they are at fault.

The action that moves from the address step to confirmation names its destination. It means more than one more step — that input is
finished and the user is moving to reading back before sending.

## How Address Autocomplete Looks

Announce that autocomplete happened. A change in the input field's value alone does not reach users who are not looking there. There is
no text for the waiting state (with a fast response it is swapped back for the result, and the text flickers).

**Once it is known that the autocomplete mechanism is not working, close the lookup action.** Leaving an action that will never do
anything makes the user doubt the postal code they entered and try again and again. The announcement region shows text prompting manual
entry. When there was merely no match, the action stays.

## Confirmation Step

**No input fields.** Fixing is done by going back to the earlier step. Field names and values are listed in pairs, and when an optional
field is empty, the row is not removed but shows that it is empty. Removing the row would fail to convey that the field exists at all,
and would move the positions of the other fields.

## Submission Result

Whether it succeeds or fails, no result is left on this screen. On success the screen moves; on failure the reason appears at the top
of the form.

## Checking in the Catalog

In Storybook there is no endpoint to look up addresses, so the catalog itself returns the responses. The postal codes that can be looked
up are `150-0001` (the town area splits), `220-0012` (resolves down to the town area), and `000-0000` (the autocomplete mechanism is not
working); anything else gives no match. Details are in the
[feature's README](../../../../../src/features/account/README.md).

## Related

- Implementation: `src/features/account/onboarding/`
- The authentication side: [`/login`](../login/page.screen.md)
- The screen handling the same fields: [`/mypage/edit`](../../shop/mypage/edit/page.screen.md)

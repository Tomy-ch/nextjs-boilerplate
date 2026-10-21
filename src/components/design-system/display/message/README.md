# Message

## Purpose

Shows a single message with a sender and a body. On surfaces that list "who, when, what" in time order, such as conversations, notifications or a record of state transitions, it carries the structure of one message and the spacing between messages shown in succession.

## Role and Public Components

| Component | Role |
| --- | --- |
| `MessageGroup` | The area that stacks consecutive messages vertically as one group. It holds only spacing and has no role. |
| `Message` | One whole message. `align` swaps the avatar and body left and right. |
| `MessageAvatar` | The circular frame that indicates the sender. The caller places its content. |
| `MessageContent` | The area that stacks the body and the auxiliary information before and after it vertically. |
| `MessageHeader` | Auxiliary information placed before the body, such as the sender name or time. |
| `MessageFooter` | Information placed after the body, such as the delivery status or auxiliary actions. |

`MESSAGE_ALIGN` and `MessageAlign` are exported from `message.definition.ts`. That definition is the owner of the values `align` can take; callers do not write strings such as `"end"` directly.

| align | Appearance |
| --- | --- |
| `start` | Places the avatar first and the body after it. This is the default. |
| `end` | Reverses the order of avatar and body and aligns the body content to the right edge. |

## Use Cases

- Listing an exchange between two parties in time order, split left and right by sender
- Showing consecutive messages from the same sender as one block with `MessageGroup`
- Adding auxiliary actions such as delivery status or resend after the body as `MessageFooter`
- Listing notifications without an avatar together with a `MessageHeader` holding only the sender name and time

It does not hold the bubble surface (background, rounded corners, tail). The caller builds the look of the body as children of `MessageContent`. Use `Marker` for a one-line annotation such as a date divider, and `Alert` for a notice that must not be overlooked.

## Responsibility Boundaries

In the SSR-first selection it is `◎`. It is a display-only Server Component that needs no hydration and has no client island. Only when switching based on the image load result is needed inside `MessageAvatar` does it compose `Avatar`, a client island, as a child.

It owns neither fetching messages, their order, the decision of where to break groups, date formatting, nor sanitizing the body. The caller decides all of these, and this component receives already formatted content as children. To show sanitized Markdown / HTML in the body, use `Typeset` alongside it.

`align` is only a visual distinction that swaps avatar and body left and right, and carries no semantics. Assistive technology does not read out the direction, so always indicate who is speaking as text in `MessageHeader`.

When `align="end"`, `MessageContent` aligns only direct children that carry `data-slot` to the right edge. This rule does not apply when a bare element such as `p` is placed in the body, so the caller fits the width to the content and aligns it to the right edge. Storybook puts a local bubble component inside the story and shows the form including this specification.

Neither `MessageGroup` nor `Message` has a role. When it must be conveyed to assistive technology that this is a list of conversation or notifications, the caller gives a `role` and an accessible name. Making an unnamed `list` the default on this component's side would add meaningless nesting to screen reading.

`MessageAvatar` is decorative as long as the sender name is next to it. When placing an image inside, leave `alt` empty; do not design it so that the avatar alone identifies the sender.

`MessageHeader` and `MessageFooter` drop their left and right padding when the message contains a surface with `data-variant="ghost"`. This is for combining with a variant that has no bubble surface; this component itself does not output `data-variant`.

It has no vendor dependency. It uses only `cn`.

## Storybook and Tests

Storybook checks the default message, `start` / `end` side by side to compare directions, the case without an avatar, adding `MessageFooter` (the avatar shifts up to match the body height), consecutive display with `MessageGroup`, and wrapping of a long body and of an unbroken string. The left-right reversal, the avatar position following the footer, and wrapping can only be judged in real rendering, so they are within Storybook's scope.

The tests check that the default is a `div` in the `start` direction, that `align` is exposed as `data-align`, that sender and body remain as text in a reading order independent of direction, that each area can be identified by `data-slot`, that by default no element has a role, that an action placed in `MessageFooter` is reachable, that `MessageGroup` contains multiple messages and keeps the caller's `role` and accessible name, and the automated a11y check.

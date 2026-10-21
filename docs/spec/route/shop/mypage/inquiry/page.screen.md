# `/mypage/inquiry` Inquiries (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

The screen for reading the conversation with support and sending a message. **An arriving message appears in the list without waiting for a refetch.**

## What It Shows

| Area | Content |
| --- | --- |
| Receiving status | One word on whether new messages are being received |
| Conversation | Date separators, and messages split left and right by sender |
| Submission field | Body input and send |

**No heading is shown on the screen.** This is to use the screen's full height for the conversation and the submission field; what this screen is
is shown by the global nav and the tab title.

**It is placed in the document, though.** If it were omitted, the only way for assistive technology to learn "which screen am I on" would be
to trace the global nav. The screen's name is placed as an invisible heading, and the screen's appearance does not
change.

**The screen itself does not scroll vertically.** Only the conversation flows inside its frame, and the submission field always stays at the bottom edge.
This keeps the preceding messages visible while typing; if the whole screen flowed, the user would have to go back down to the bottom
after every send.

## How the Conversation Looks

The user's own messages lean right and support's lean left.

**Direction does not reach assistive technology.** Left and right are only a visual distinction, so who sent each message is always stated in text
in each message's heading.

**Times go on each message, dates on separators.** Messages with the same time can occur on different days, so without separators
each message would need its own date.

**Line breaks in the body are preserved.** The contract holds the body as a single string, and the line breaks the writer entered are part of it.
Long strings without break points wrap.

Only what is added is announced to the screen reader. Messages already listed are never rewritten (per the contract, they are
only appended).

## How Submission Looks

**The message being sent is placed at the end with the same direction and the same surface as a confirmed one.** Neither its position nor its look
changes the moment it arrives, so to the sender it does not look as if the row was swapped.

**The draft is cleared only when it succeeds.** If the body vanished on a submission that did not go through, it would have to be retyped.

It cannot be sent empty. `⌘Enter` / `Ctrl+Enter` also sends.

Failures are shown next to the submission field. If the body did not pass the contract, it is tied to the input; otherwise it is shown as one line
above the field.

## How the Receiving Status Looks

**It stays shown.** If it were shown only while disconnected, the screen could not tell whether its absence means "connected" or
"not receiving at all."

| Status | When |
| --- | --- |
| 待機中 (Waiting) | There are no messages yet, and nothing to subscribe to |
| 接続中 / 受信中 / 再接続中 (Connecting / Receiving / Reconnecting) | The subscription's state as is |
| オフライン (Offline) | The network is down. **Shown in preference to the subscription state** |
| ログインし直すと再開します (Resumes after you log in again) | The session expired |
| 受信を停止しました (Stopped receiving) | Permission was lost, or the server ended it |

While the network is down the subscription is always mid-reconnection, and showing only 「再接続中」 there would make it look as if
the backend were the party to fix.

## When There Are No Messages Yet

One line of guidance is shown in place of the conversation, and the submission field is shown as is. **It is not a fetch failure** — having no
inquiry is not an error, and the first message creates the inquiry.

## Loading and Failure

The loading UI places a container of the same height as the finished screen first. If the frame's height were decided later, the submission field
would move the moment the conversation arrives.

Fetch failures are received by this route's error boundary.

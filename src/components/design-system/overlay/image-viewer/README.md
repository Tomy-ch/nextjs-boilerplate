# ImageViewer

## Purpose

Shows an image that is listed at reduced size in a large view when it is pressed.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ImageViewer` | Uses the thumbnail as the trigger and opens the enlarged view in a `Dialog`. |

## Use Cases

Use it where images are listed at reduced size, such as a carousel or a gallery, and the user wants to check the details.

Do not use it where the image itself is not the focus (avatars, icons, decoration). Even if it looks pressable, there is nothing to gain from what opens.

## Responsibility Boundaries

**It holds no arrangement, frame or aspect ratio.** The caller passes the trigger's content as `children`. The frame changes depending on whether it sits in a carousel or on its own, and deciding it here would require overrides for every placement.

**It holds no substitute for a missing image either.** What to show instead depends on the nature of the item, so the caller handles it with `fallbackSrc` of `MediaImage` or similar. Deciding which images are pressable and which are not is also the caller's call.

Opening / closing, the focus trap, Escape and making the background inert are delegated to `Dialog`.

## Syncing the Position Both Ways

The enlarged view is also a carousel. Showing only one image would require closing and choosing again to see the next one. Paging rides on the same mechanism as the main carousel (horizontal scrolling and snapping), so touch swipes work as they are.

**On opening it starts from the pressed position, and on closing it moves the main carousel to the position paged to.** Without this, a mismatch remains: you page to the third image in the enlarged view and close, yet the main carousel is still on the first.

The main carousel is found by walking up the DOM ancestors (`[data-slot="carousel-content"]`). When placed outside a carousel, only the starting position takes effect, and since there is nothing to move, nothing happens.

After closing, focus returns not to the pressed trigger but to **the trigger at the position paged to**. Leaving it to the default focus return makes the browser pull the pressed trigger's slide into view, pushing back the position just moved to.

## Fitting the Enlarged View

It fits into a box relative to the viewport with `object-contain`. Rendering at full size without knowing the image's actual dimensions would make a tall image overflow the screen so that the whole cannot be seen. It is not cropped because enlarging is an operation for "seeing all of it".

The default width of `Dialog` (`sm:max-w-lg`) is a reading width meant for text, so the class is removed together with its `sm:` variant and the image's own width is used.

## Accessibility

The trigger is a `button`. Attaching a click to an image cannot be reached from the keyboard and does not convey that it is pressable.

The trigger's accessible name is 「〈説明〉を拡大する」 ("enlarge 〈description〉"). The thumbnail's alternative text alone does not tell, from the list of controls, what happens when it is pressed.

The dialog's accessible name is the image's description itself. It is the same image merely opened, so the enlarged view is not given a different description.

## Print

The trigger is not printed. Pressing is meaningless on paper, and the enlarged view is not even in the DOM unless open.

## Storybook and Tests

Storybook checks a thumbnail placed on its own, opening from an image partway through, and placement in a carousel. In the story placed in a carousel, it observes that paging in the enlarged view and then closing moves the carousel behind it to that position.

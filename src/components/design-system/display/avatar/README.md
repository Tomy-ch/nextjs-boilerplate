# Avatar

## Purpose

Makes users and organizations easier to identify with a small circle.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Avatar` | The client-side root that switches between the image and the fallback. `size` chooses the display size. |
| `AvatarImage` | The image, shown only when loading succeeds. |
| `AvatarFallback` | The fallback shown when the image cannot be displayed. Holds initials or an icon. |
| `AvatarBadge` | A small indicator overlaid on the avatar's bottom right. |
| `AvatarGroup` | Lays out several avatars slightly overlapping. |
| `AvatarGroupCount` | Placed at the end of `AvatarGroup`, shows the number of people that could not be displayed. |

`AVATAR_SIZE` is owned by `avatar.definition.ts`. It has three values, `default` / `sm` / `lg`, and the size of `AvatarGroupCount` follows the `size` within the group.

## Use Cases

Used where people or organizations are shown repeatedly, such as list rows, a my-page screen, or the authors of comments and history entries.

## MediaImage vs This Component

| | Where to use |
| --- | --- |
| `Avatar` | Identifying people and organizations. Cropped to a circle, switching to initials or similar when loading fails |
| `MediaImage` | Images as content. Fixed aspect ratio, showing a Skeleton while loading |

Whether it switches is the dividing line. `Avatar` replaces its display according to the load result, so it is a client island that needs hydration; `MediaImage` has no replacement and is an SSR-first Server Component. If the display does not change with the load result, do not use `Avatar`.

## Responsibility Boundaries

It does not own the image source, the fallback string (how initials are made), the state the indicator shows, or the decision of how many people to show in a group. All are decided by the caller and passed as props.

The avatar itself is an aid to identification. Who it refers to is conveyed by adjacent copy such as the person's name, so the design never relies on the avatar alone to identify a person.

The vendor is currently Radix.

## Accessibility

The caller must always specify `alt`. When the name is shown next to it and the avatar is merely decorative, use `alt=""`; when the avatar alone indicates the person, pass copy that tells who it is. Writing the same information as `AvatarImage`'s `alt` into `AvatarFallback` conveys the same information twice when it switches.

`AvatarBadge` conveys no meaning through color or a dot alone. When a state needs to be conveyed, put `sr-only` copy in its children or supplement it with adjacent copy.

## Storybook and Tests

Storybook checks a successful load, the fallback, the list of sizes, with an indicator, a group with the remaining count, and the case where the avatar alone indicates the person. Tests check the switch before and after loading, that it stays on the fallback when loading fails, that an empty `alt` takes it out of screen reader output, the `size` data attribute, the composition of the indicator and group, and automated a11y checks.

jsdom does not actually fetch images, so tests replace `Image` and reproduce only the load result. Radix decides the state with `addEventListener` and `complete` / `naturalWidth`, so the stub matches that shape. This is not addressed by removing the image-fetching dependency from the implementation.

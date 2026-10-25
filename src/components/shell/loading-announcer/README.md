# LoadingAnnouncer

## Purpose

Tells assistive technology, once and in one place, that part of the screen is loading — and that it has finished — while the loading
UI itself stays out of the accessibility tree.

## Role and Public Components

| Component | Role |
| --- | --- |
| `LoadingAnnouncerProvider` | Client Provider mounted once at the root. Always renders an empty `role="status"` region (visually hidden) and puts the loading / loaded wording into it. |
| `LoadingAnnouncement` | Renders nothing. While it is mounted, it counts as one thing loading. Placed inside a `Suspense` fallback. |

`loading-announcer.definition.ts` owns `LOADING_ANNOUNCEMENT` (the two wordings) and `ANNOUNCE_LOADING_AFTER_MS` (the wait before
announcing).

## Use Cases

- Put one `LoadingAnnouncement` inside every skeleton a `Suspense` boundary falls back to. The skeleton stays `aria-hidden`; the
  leaf renders nothing, so it may sit inside it.
- Mount `LoadingAnnouncerProvider` once, in the root layout, beside the other cross-cutting Providers.

```tsx
import { LoadingAnnouncement } from "@/components/shell/loading-announcer/loading-announcer";
import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";

export function ExampleSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <LoadingAnnouncement />
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
```

## Design

- **The region exists before anything is put in it.** A live region is only reliably announced when it is already in the DOM when its
  content changes (WCAG 2.2 Technique ARIA22, `role="status"`). A region rendered together with its text — a `role="status"` inside each
  skeleton — is read inconsistently, and several skeletons at once would be read several times. So there is one region, at the root,
  outside every route group's shell: a shell per route group would recreate the region on every navigation between groups.
- **Short waits are not announced.** Loading that finishes within `ANNOUNCE_LOADING_AFTER_MS` says nothing, so "loading" is not read
  after the content it was about.
- **The end is announced only when the start was.** Removing text from a live region is not read (`aria-relevant` defaults to
  `additions text`), so emptying the region would never tell the user that loading finished. The loaded wording stays until the next
  loading replaces it.
- **No `aria-busy`.** It declares that an element which remains is being modified; a `Suspense` fallback is replaced wholesale, so there
  is nothing left for assistive technology to wait on.
- **Loading that finishes before hydration is not announced.** The leaf counts only once its effect runs. The arrival of the page itself
  is read as a document.

## Responsibility Boundaries

It does not decide what is loading or how loading looks — the skeleton owns the look, and the `Suspense` boundary owns when it is
shown. It does not announce results of actions ([`toaster`](../toaster/README.md)) or list counts (the count regions of lists).

## Storybook and Tests

The stories show the empty region and a mounted leaf; the region itself is not visible, so what is checked is the `status` in the
accessibility tree. The tests check that the region exists empty before anything loads, that a wait shorter than the threshold says
nothing, that several leaves produce one wording, that the end is announced only after the start was, that a doubled effect in
development still counts once, and axe.

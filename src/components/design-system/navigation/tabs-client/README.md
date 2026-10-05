# TabsClient

## Purpose

Switches between several panels while keeping the same URL.

## Role and Public Components

| Component | Role |
| --- | --- |
| `TabsClient` | The client-side root that holds the selected tab. |
| `TabsClientList` | The `tablist` that lays out the tabs. Handles movement with the arrow keys and roving tabindex. |
| `TabsClientTrigger` | The `tab` that selects a panel. Linked to the corresponding panel by `value`. |
| `TabsClientContent` | The `tabpanel` corresponding to a tab. Only the one selected is rendered. |
| `tabsClientListVariants` | A helper that builds the look variants of `TabsClientList`. |

## Use Cases

- Merely switching between already fetched content without putting it in the URL
- Switching an auxiliary display while keeping content that is partway through being entered

## `TabsNative` vs This Component

Choose by **fetch cost and URL**, not by visual preference.

| | `TabsNative` | `TabsClient` |
| --- | --- | --- |
| Data fetched | Only the view being shown | Every view, every time |
| Initial payload | One view | All views |
| Panel rendering | server | server (through `children`) |
| Sharing, reload, back | Preserved | Lost |
| Feel of switching | route navigation | Immediate |

When fetching is split per view or panel content is large, use `TabsNative`. `TabsClient` puts views that are not shown into the initial render as well, so it becomes less favorable the more views there are and the larger their content.

## Responsibility Boundaries

In the SSR-first selection it is the exception to `◎`. The default is `TabsNative`, which switches by URL; choose this one when an immediate switch that should not go into the URL is needed. It needs hydration and cannot be rendered directly from a Server Component. When the panel content itself needs no client runtime, pass elements assembled in a Server Component as the `children` of `TabsClientContent`.

Passing `value` makes it a controlled component and `defaultValue` an uncontrolled one. Each tab and panel are matched by equal `value`. It holds no fetching, business decisions or persistence of the selection.

It has `role="tablist"` / `tab` / `tabpanel`, and Radix handles movement with the arrow keys, roving tabindex, and matching selection to panels. Unlike `TabsNative` it involves no navigation, so tabs are exposed as buttons rather than links. When placing several tabs on one screen, give `TabsClientList` an `aria-label` to show which switch it is.

By default, unselected panels are removed from the DOM. To keep values partway through input, the caller holds the state or specifies `forceMount`.

**`forceMount` means only "keep it in the DOM"; hiding is the responsibility of `TabsClientContent`.** The vendor interprets `forceMount` as "always present" and drops the hidden styling, so the component hides the look itself based on the selection state. Without this, values remain but all panels are visible at once, and the tabs become decoration instead of a switch. To also remove it from assistive technology in addition to the look, the caller passes `hidden` to the unselected panels.

For panel content, **pass Server Components as `children`**. Even though this component is a client island, the elements passed in arrive as rendered on the server. Conversely, `import`ing a panel inside a client file pulls it into the client boundary at that point, and the whole thing is sent to the browser.

For views that cannot be selected, **as a rule, do not show the tab at all**. Listing views that cannot be shown for lack of permission as disabled only announces the existence of something unreachable. If the data has merely not been fetched yet, keep the tab enabled and show a `Skeleton` in the panel. Use `disabled` only when it cannot yet be reached in the procedure. Switching is synchronous and immediate with no in-progress state, so there is no "block until processing finishes" use either.

The vendor is currently Radix, but the public API contains no vendor name.

## Storybook and Tests

Storybook checks the default composition, the `line` variant shown with an underline, and vertical orientation. As stated above, `disabled` is not used as a rule, so there is no story for it.

The tests check the `tablist` / `tab` / `tabpanel` semantics and the naming of `tablist`, that only the selected one is `aria-selected`, that only the selected panel is shown, that when kept in the DOM with `forceMount` the unselected inputs remain in the submission, that passing `hidden` to them removes them from display, replacing panels on selection, movement with the arrow keys, that they are exposed as buttons rather than links, that passing `disabled` actually rejects selection, and the automated a11y check.

Interaction starts from `mouseDown` rather than `click`. Radix switches selection on pointer press and focus, so the tests follow that path. Focus movement by the arrow keys happens asynchronously, so it is awaited with `waitFor`.

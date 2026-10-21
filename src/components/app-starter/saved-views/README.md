# SavedViews

## Purpose

Saves the filters and sorting that are rebuilt again and again in a list under a name, so that from then on choosing one returns to the same view.

## Role and Public Components

| Component | Role |
| --- | --- |
| `SavedViews` | Gathers into one trigger the actions to choose a saved condition again, save one under a name, rename it, and delete it. |

| props | Type | Role |
| --- | --- | --- |
| `views` | `readonly SavedView[]` | The conditions that can be chosen. They have only `id` and `name`. |
| `currentViewId` | `string \| null` | The condition currently applied. `null` means "none applied". |
| `onSelect` | `(viewId: string) => void` | A condition was chosen. |
| `onCreate` | `(name: string) => void` | Save the current conditions under a name. |
| `onRename` | `(viewId: string, name: string) => void` | The selected condition was renamed. |
| `onDelete` | `(viewId: string) => void` | The selected condition was deleted. Confirmation is already done. |
| `label` | `string` | The accessible name of the action. It is also the trigger's display when no condition is applied. Defaults to 「保存した条件」 ("saved conditions"). |

`SavedView` is just the two fields `{ id, name }`. The content of the conditions is not in this type.

## Usage

### Placing it in a list toolbar

The conditions themselves and where they are stored are owned by the caller. Only names and `id`s are passed to this component.

```tsx
"use client";

import { useCallback, useState } from "react";

import { SavedViews, type SavedView } from "@/components/app-starter/saved-views/saved-views";

export function ListToolbar({ initialViews }: { initialViews: readonly SavedView[] }) {
  const [views, setViews] = useState(initialViews);
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);

  // いまの絞り込み条件を呼び出し元が束ね、発行された id を選択中にする
  const create = useCallback((name: string) => setViews(saveCurrentConditions(name)), []);
  const rename = useCallback((viewId: string, name: string) => setViews(renameView(viewId, name)), []);
  const remove = useCallback((viewId: string) => setViews(removeView(viewId)), []);

  return (
    <SavedViews
      currentViewId={currentViewId}
      onCreate={create}
      onDelete={remove}
      onRename={rename}
      onSelect={setCurrentViewId}
      views={views}
    />
  );
}
```

### Connecting conditions to the URL or storage

`onSelect` only returns an `id`; it neither rewrites the URL nor fetches. Whether conditions go in the URL's query, are saved to the backend, or are kept in the browser is decided by the feature. `onCreate` also receives only a name, so what "the current conditions" refers to is answered by the caller's state.

```tsx
const selectView = useCallback(
  (viewId: string) => {
    setCurrentViewId(viewId);
    router.replace(`?${new URLSearchParams(conditionsOf(viewId))}`);
  },
  [router],
);
```

### Alongside the Filtering UI

The filtering controls themselves are owned by [`filter-bar`](../../patterns/filter-bar/README.md), and how the table is shown by [`table-view-options`](../../patterns/table-view-options/README.md). This component is the layer that recalls their result by name, and it has no UI for editing conditions.

## Use Cases

- When a list has several filter combinations that are switched between
- When you want to give a saved condition a clearer name later

Not placed on a screen with only one condition. There would be nothing to choose, and it would be a save-only action.

## Responsibility Boundaries

In the SSR-first selection it falls under `×`. Opening and closing the menu and dialogs happens on the browser side, so hydration is needed, and it cannot be rendered directly from a Server Component.

It does not own the content of conditions. Filter and sort values, where they are stored, syncing with the URL, and issuing `id`s are all owned by the caller. This component handles only `id`s and names.

Renaming and deleting target **the one selected item**. While `currentViewId` is `null`, neither can be chosen. Individual actions are not placed on each row of the list because nesting action buttons inside menu items breaks the menu's keyboard interaction and screen reader output.

Deletion cannot be undone, so it goes through an `AlertDialog` (`role="alertdialog"`) confirmation. Name input is an ordinary `Dialog`. Both are controlled dialogs placed outside the menu, so they do not disappear along with the trigger when the menu closes.

Names are passed with leading and trailing whitespace trimmed. The save button cannot be pressed for a whitespace-only name. Duplicate names are allowed. Whether the same name is allowed is a constraint of the storage, and this component does not decide it.

The vendor is Radix (`DropdownMenu` / `Dialog` / `AlertDialog`).

## Storybook and Tests

Storybook places it in `Container/SavedViews` and checks the state with a condition chosen, the state with none applied, the state with no saved conditions yet, and the state with the action's name replaced. In the Default story, choosing, saving, renaming and deleting all work end to end, so the shape of the state the caller owns can be read from it as is.

Tests check the trigger's display, that conditions are listed as `menuitemradio` and the selected one is marked, what choosing, saving, renaming and deleting each return, that actions cannot be chosen when there are no conditions or none is applied, that leading and trailing whitespace in names is trimmed, that whitespace-only names are rejected, that the current name is the initial value when renaming, the accessible names and descriptions of the dialog and alertdialog, that nothing happens when the confirmation is cancelled, and automated a11y checks.

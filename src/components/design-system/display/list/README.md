# List

## Purpose

Stacks rows of the same shape vertically and shows an icon, title, description and auxiliary actions in a consistent structure.

## Role and Public Components

| Component / value | Role |
| --- | --- |
| `List` | The list root that renders `ul`. Composes into `ol` with `asChild`. |
| `ListItem` | A row that renders `li`. `variant` selects the surface treatment and `size` the spacing. |
| `ListItemLink` | A link that makes the whole row the navigation target. Makes the row operable while keeping `li`. |
| `ListItemMedia` | An icon or image placed at the start of the row. `variant` selects the `icon` / `image` frame. |
| `ListItemContent` | The area that groups the title and description. |
| `ListItemTitle` | The subject of the row. |
| `ListItemDescription` | Description that supplements the subject. Truncated at two lines. |
| `ListItemActions` | The area for auxiliary actions at the end of the row. |
| `ListItemHeader` / `ListItemFooter` | Supplementary lines added above and below the row. |
| `ListSeparator` | A separator placed between rows. Placed as an `li` and excluded from screen reading. |

`list.definition.ts` is the owner of `LIST_ITEM_VARIANT` / `LIST_ITEM_SIZE` / `LIST_ITEM_MEDIA_VARIANT`.

## Use Cases

Use it wherever rows of the same shape repeat: settings lists, notification lists, search results. For a list of steps whose order matters, compose into `ol` with `asChild`.

## Card / Table vs This Component

| | When to use |
| --- | --- |
| `List` | **Rows** of "icon + title + description + action" stacked vertically |
| `Card` | A **block** that encloses related information and actions. Each item may have a different structure |
| `Table` | A **table** with aligned columns. Compares the same attributes across items |

Use `Table` when you want aligned columns for comparison, and `List` when you want it read as rows.

## Internal Structure

`List` renders `ul` and `ListItem` renders `li`. The caller does not need to write `li`, and the semantics of `ul` stay intact.

```tsx
<List>
  <ListItem>
    <ListItemMedia variant={LIST_ITEM_MEDIA_VARIANT.ICON}>
      <BellIcon />
    </ListItemMedia>
    <ListItemContent>
      <ListItemTitle>通知</ListItemTitle>
      <ListItemDescription>新着や状態の変化をお知らせします。</ListItemDescription>
    </ListItemContent>
    <ListItemActions>
      <SwitchNative aria-label="通知を受け取る" />
    </ListItemActions>
  </ListItem>
</List>
```

To make the whole row a navigation target, do not replace `ListItem` with a link; place `ListItemLink` as its child. Losing `li` breaks the semantics of `ul`; this is the same division of roles as `BreadcrumbLink` / `PaginationLink`.

```tsx
<ListItem>
  <ListItemLink asChild>
    <Link href="/settings/notifications">…</Link>
  </ListItemLink>
</ListItem>
```

`ListSeparator` renders as an `li`. An `hr` cannot be placed directly under `ul`; this is the same treatment as `BreadcrumbSeparator`.

## Responsibility Boundaries

It owns no decision on the row content, the navigation target, running an action, the order or the count. It holds no business types either; the caller passes the needed elements as children.

Even when a row has inputs, the row itself is not made into an input component. Compose `Label` and `Input` inside the row (Storybook's `WithInputs` is an example). Adding and removing rows and saving are owned by the feature. `editable-table` has the same responsibility boundary, so the table and the list do not split the decision.

## Upstream Correspondence

The registry item is `item`. In this repo `*Item` is used across 17 components as the word for "an element of a collection", so a bare `Item` would collide in meaning. Naming the root `List` and the row `ListItem` aligns it with the shape of `BreadcrumbItem` / `PaginationItem` / `NavigationMenuItem`. The correspondence is declared by `directory` / `localPath` in `shadcn-manifest.yaml`.

Upstream's `ItemGroup` was a `div` with `role="list"`, but its children did not become `listitem` and it violated `aria-required-children`. Rendering `ul` / `li` plainly resolves this structurally.

## Storybook and Tests

Storybook checks the basic composition and separators, making the whole row a link, rows with inputs, surface treatments, spacing sizes, rows with a header and footer, and an ordered list composed into `ol`. The tests check the `ul` / `li` semantics, composition of each row area, the `variant` / `size` data attributes and their defaults, that `li` is not lost when the row becomes a link, an external link without `asChild`, that separators are excluded from screen reading, composition into `ol`, header / footer placement, and the automated a11y check.

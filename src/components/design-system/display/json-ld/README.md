# JsonLd

## Purpose

Embeds the screen's structured data (schema.org / JSON-LD) as `<script type="application/ld+json">`.

## Role and Public Components

| Component | Role |
| --- | --- |
| `JsonLd` | Places the received object as a JSON-LD script. Escapes `<` so the value's content cannot close the script |

## Use Cases

A screen that wants to tell search engines its meaning (an organization, article, event and so on) passes an object built with the schema.org vocabulary. What to convey is the screen's decision, and the function that builds the object lives on the feature side ([ADR 0044](../../../../../docs/adr/0044-seo-metadata-strategy.md)).

It may be placed in the body rather than `<head>`. JSON-LD is read wherever it is in the document. Its reader is a search engine rather than a person, but it is still a `display` component that shows received content in readable form.

## Responsibility Boundaries

**What it owns is only serialization and escaping.** It validates neither schema.org types nor properties. Whether the built object is correct as vocabulary is checked by the tests on the building side.

`<` is escaped to `\u003c` because, as long as the values come from the backend, it cannot be assumed that the strings contain no `</script>`. The value as JSON does not change.

It can be used as a Server Component. No hydration is needed.

## Storybook and Tests

Storybook shows that it is a component with no visible element. Tests check that the script is placed and can be read as JSON, that it has no visible element, and that characters that would close the script are escaped without changing the JSON value.

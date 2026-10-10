# ImportExport

## Purpose

Displays the **results** of importing from a file and exporting to a file.

Choosing files, validating format and size, and the list of what is selected are owned by [`file-upload`](../file-upload/README.md) and [`upload-preview`](../upload-preview/README.md). This component handles what comes after: **what happened once the import ran**.

## Role and Public API

| Component | Role |
| --- | --- |
| `ImportSummary` | Summarizes the import result as counts. |
| `ImportErrorList` | Lists the rows that could not be imported, with their line numbers in the original file. |
| `ExportButton` | The action that generates the output and receives the resulting file. |

## A partial failure is handled as its own state

An import does not fit into all-succeeded or all-failed. **"Imported" alone leaves dropped rows unnoticed, and "Failed" alone is misread as having rolled back even the rows that went through.**

`ImportSummary` changes its copy and look depending on whether there are zero failures, and when there are failures it also states the number that succeeded.

The result is conveyed with `role="status"`. An import takes time and the user has looked away from the screen, so a visual change alone does not tell them it has finished.

## Line numbers are passed from the original file

If the imported rows are renumbered consecutively, the user cannot tell where to fix their own file.

The item name is passed only when the cause lies in a specific column. When the whole row is the cause (the column count does not match, for example), leave it empty, and the table shows `—`.

**Narrowing the count is the caller's decision.** This component lists every row it is given. How many to show depends on the scale of the import, so the component side cannot decide it.

## The 3 States of Export

| State | Display |
| --- | --- |
| Before generation | A pressable button |
| Generating | A non-pressable button + spinner + 「書き出しています」 ("exporting") |
| Ready to receive | A link with `download` |

Generating and receiving are separate states. Changing only the content while keeping the same look does not convey that it has become pressable. While generating, the copy changes too. A spinner alone does not tell a screen reader user what they are waiting for.

**When `pending` and `href` are both set, generating wins.** When generating the next output while still holding the URL of the previous one, leaving a pressable link would let the user receive a file different from what is being generated now.

## Responsibility Boundaries

It does not own running the import, the data schema, conversion, output format, or the file's contents. The caller passes the counts, row errors, state and URL.

The path to rerun is composed as `children` of `ImportSummary`. Whether it is "only the failed rows" or "redo everything" depends on what the import means, so this component does not decide it.

## Storybook and Tests

Storybook checks the case where everything was imported, a partial failure, the case where a whole row is the cause, and the 3 states of export. The partial-failure story has rerun wired in: each press inserts the running display and reduces the failed rows by one, and once all pass the summary changes to the success display and the list and rerun path disappear. This is where the correspondence of counts and rows, that it cannot be pressed while running, and that redoing returns to the original state are checked. Tests check the count copy, `role="status"`, the look on failure, replacing the unit, composing actions, the table's line numbers, items and reasons, the case with an empty item, that every row given is listed, the 3 states of export and replacing their copy, and automated a11y checks.

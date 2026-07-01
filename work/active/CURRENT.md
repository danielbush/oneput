# Current

Aim: We don't want the ui to have to distinguish templates from non-templates; the ui is going to say: insert:

- "paragraph"
- "list"
- "list with p-tag"
- "table"
- "table with header"

where

- "paragraph" is just a p-tag
- "list" is ul-tag + li-tag
- "list with p-tag" is ul-tag + li-tag containing a p-tag
- "table" is table with tbody, 1 tr and, say, 2 td's
- "table with header" - extends "table" with a thead

## refactor

Plan for a unified insert/append model:

- The editor/UI should see one simple concept: an insert option.
- An insert option is probably just `ElementTemplate` by another name: it has an id, label, and `ElementSpec`.
- Bare tags and richer structures live on the same spectrum:
  - paragraph: `{ tagName: "p" }`
  - list: `{ tagName: "ul", children: [{ tagName: "li" }] }`
  - table with header: `{ tagName: "table", children: [...] }`
- Guard functions should remain operation-level and should not mention templates:
  - `canAppend()`
  - `canInsertAfter()`
  - `canInsertBefore()`
- Retrieval functions should return insert options:
  - `getAppendOptions()`
  - `getInsertAfterOptions()`
  - `getInsertBeforeOptions()`
- Internally, option retrieval can combine:
  - curated options from the catalog
  - minimal bare-tag options where useful
  - manual/ad hoc tag-name input represented as an `ElementSpec`
- Low-level tag rules still validate what is legal in a given position, but the rest of the editor should not have to distinguish "tag candidate" from "template candidate".
- Execution can keep accepting `ElementSpec`:
  - `appendNew(spec)`
  - `insertNewAfter(spec)`
  - `insertNewBefore(spec)`
- The UI should show options from one list and submit the selected option's `spec`. Manual entry should create the same kind of spec rather than branching into a separate model.

## 2026-07-01 - dom-rules template usage trace

Traced these facade exports from `packages/jsed/src/lib/core/dom-rules.ts`:

- `getAllowableChildTemplates`
- `getAllowableInsertAfterTemplates`
- `getAllowableInsertBeforeTemplates`

Direct implementation:

Plan to unify this:

- Treat `ElementTemplate` as the single editor-facing insert option. A bare tag is represented as a minimal template, e.g. `{ spec: { tagName: "p" } }`; richer structures like lists and tables are larger templates.
- Keep low-level tag legality inside `dom-rules/html-content.ts` and `dom-rules/insert-rules.ts`, but do not expose tag-candidate decisions to the rest of the editor unless a low-level operation needs to validate a submitted `ElementSpec`.
- Make the public/editor-facing names explicit about templates:
  - `hasAppendTemplates(parent)` or `canAppendTemplate(parent)`
  - `hasInsertAfterTemplates(target)` or `canInsertTemplateAfter(target)`
  - `hasInsertBeforeTemplates(target)` or `canInsertTemplateBefore(target)`
  - `getAppendTemplates(parent)`
  - `getInsertAfterTemplates(target)`
  - `getInsertBeforeTemplates(target)`
- In `EditorFocusOps`, rename guards so they do not imply generic tag-level insertion:
  - `canAppend()` -> `canAppendTemplate()`
  - `canInsertAfter()` -> `canInsertTemplateAfter()`
  - `canInsertBefore()` -> `canInsertTemplateBefore()`
- In the UI, gate the pick-list menu from the template guards. Manual tag-name entry should be modeled as creating an ad hoc `ElementTemplate` / `ElementSpec`, not as a separate concept the rest of the editor understands.
- Keep execution methods accepting `ElementSpec` for now:
  - `appendNew(spec)`
  - `insertNewAfter(spec)`
  - `insertNewBefore(spec)`
  These remain the low-level execution boundary and should continue validating the submitted `spec` against tag rules.
- Add or adjust tests around the renamed guards so they describe template availability, not generic append/insert capability.

- `packages/jsed/src/lib/core/dom-rules/insert-rules.ts`
  - `getAllowableChildTemplates(tagName)` derives allowed child tag names with `getAllowableChildTags(tagName)`, then retrieves matching templates with `getElementTemplatesForTags(..., "appendInside", tagName)`.
  - `getAllowableInsertAfterTemplates(target)` derives allowed after tag names with `getAllowableInsertAfterTags(target)`, then retrieves matching templates with `getElementTemplatesForTags(..., "insertInside", target.parentElement.tagName)`.
  - `getAllowableInsertBeforeTemplates(target)` does the same for before insertion.

Direct consumers:

- `packages/jsed/src/lib/ops/focusable.ts`
  - `getAppendTemplates(parent)` calls `getAllowableChildTemplates(parent.tagName)`.
  - `getInsertAfterTemplates(el)` calls `getAllowableInsertAfterTemplates(el)`.
  - `getInsertBeforeTemplates(el)` calls `getAllowableInsertBeforeTemplates(el)`.
- `packages/jsed/src/lib/core/__tests__/dom-rules.test.ts`
  - Tests table/list template filtering behavior.

Indirect UI/editor flow:

- `packages/jsed/src/editor/lib/EditorFocusOps.ts`
  - `getAppendTemplates`, `getInsertAfterTemplates`, and `getInsertBeforeTemplates` expose template lists to UI.
  - `canAppend`, `canInsertAfter`, and `canInsertBefore` currently gate the operation by checking whether the relevant template list is non-empty.
- `packages/jsed/src/ui/EditDocumentControls.ts`
  - Builds pick-list candidates from the template lists.
  - Also exposes manual tag-name entry inside the same pick lists.

Concern:

- The `can*` methods currently answer "are there templates?" rather than "is this insertion operation legal by tag rules?"
- Because manual tag-name entry lives inside the same UI menu, an empty template list hides the entire operation even when a tag-level insertion might be legal.
- The likely fix is to separate tag-level availability from template availability:
  - `canAppend` / `canInsertAfter` / `canInsertBefore` should use tag candidates.
  - `get*Templates` should remain menu candidate helpers.
  - The UI can show an empty candidate list plus manual entry when tag insertion is legal but no predefined template exists.

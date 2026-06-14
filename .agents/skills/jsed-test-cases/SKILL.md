---
name: jsed-test-cases
description: "Use when the user wants to turn a jsed test document, failing test case, DOM fixture, or Vitest setup into an interactive SvelteKit demo page. This skill creates a scratch route under `apps/jsed-demo/src/routes/test-cases/` so the user can interact with the same document more naturally in the jsed demo app."
user_invocable: true
---

# Jsed Test Cases

Use this skill to convert a jsed test fixture into an interactive SvelteKit page in `apps/jsed-demo`.

The goal is not to make a polished demo. The goal is to make the exact test document easy to interact with.

## Route

Put generated pages under:

```text
apps/jsed-demo/src/routes/test-cases/
```

Use one child route per case:

```text
apps/jsed-demo/src/routes/test-cases/<case-slug>/+page.svelte
```

Examples:

- `test-cases/delete-last-token-after-island/+page.svelte`
- `test-cases/split-nested-inline-flow/+page.svelte`

The `test-cases/` directory is a scratch area. Its generated child routes are gitignored by default.

## Workflow

1. Identify the source test case.
   - If the user names a failing test, find it in the relevant `*.test.ts`.
   - If the user provides a snippet, use that as the document source.
2. Extract the document shape from helpers such as `makeRoot`, `p`, `div`, `em`, `s`, `t`, `a`, and raw HTML strings.
3. Translate the fixture into normal Svelte markup.
   - `p(...)` becomes `<p>...</p>`.
   - `div(...)` becomes `<div>...</div>`.
   - `em(...)` becomes `<em>...</em>`.
   - `t('aaa')` becomes `aaa`.
   - `s()` becomes a literal space in the markup.
   - `a()` becomes an ANCHOR-like placeholder only if the page needs to start from an already-anchorized document.
   - raw HTML strings should be copied as markup.
4. Start from `apps/jsed-demo/src/routes/exploratory-testing/+page.svelte` as the reference for imports, document wrapper, and styling.
5. Create a small page with the extracted document inside `<div id="test-doc">`.
6. Add a terse ignored heading that names the test case.
7. Keep the page minimal so the user can focus on jsed behavior.
8. Run the Svelte autofixer on the created `+page.svelte`.
9. If useful, run the jsed demo dev server and provide the local URL.

## Jsed Structure

Before searching deeply, read the top overview section of:

```text
packages/jsed/docs/architecture.md
```

That section explains the broad `lib/core` -> `lib/ops` -> `Cursor` structure. It stops short at `Editor`, but it is enough to orient test-case extraction around TOKEN, LINE, LINE_SIBLING, ANCHOR, and cursor behavior.

## Test Locations

Start with these test locations:

```text
packages/jsed/src/lib/**/__tests__/*.test.ts
packages/jsed/src/lib/**/*.test.ts
packages/jsed/src/**/*.test.ts
```

For cursor-related cases, start with:

```text
packages/jsed/src/lib/cursor/__tests__/Cursor.test.ts
packages/jsed/src/lib/cursor/__tests__/CursorSelection.test.ts
packages/jsed/src/lib/cursor/__tests__/CursorState.test.ts
```

If the user names a test, search from `packages/jsed/src`:

```sh
rg "<test name>" packages/jsed/src
```

## Page Shape

Use this shape unless the existing app has changed:

```svelte
<script lang="ts">
  import '$lib/jsed/styles/test-doc.css';
</script>

<div id="test-doc">
  <h1 class="jsed-ignore">[test name]</h1>
  <!-- translated fixture here -->
</div>
```

Add local styles only when needed to preserve the test condition, such as inline display, inline-block, island styling, or scroll containers.

## Fidelity Rules

Preserve behavior-relevant details:

- tag names
- ids used by the test
- classes such as `katex`, `jsed-ignore`, or cursor/token classes
- inline styles that affect display, flow, float, or island behavior
- empty elements and anchors
- meaningful whitespace around inline content

Do not preserve test-only helper names in visible UI.

## Naming

Slug the route from the test name or scenario:

- lowercase
- hyphen-separated
- short but specific

For example, `delete > last TOKEN after ISLAND` becomes:

```text
delete-last-token-after-island
```

## Git Hygiene

The `test-cases/` route is intended for scratch reproductions. Generated child routes should usually remain untracked.

If the user wants to keep a case permanently, ask whether it should move to a tracked demo route or become a committed fixture.

# Rename CURSOR_STATE CSS class values

## Summary

The CSS class **values** (the strings in the DOM) for the four CURSOR_STATE constants in `packages/jsed/src/lib/constants.ts` need to be renamed to match the new vocabulary. The TypeScript constant names were already renamed; this task renames the CSS class strings they hold and updates all CSS that references them.

## Current → Target

| Constant | Current CSS class | New CSS class |
|----------|------------------|---------------|
| `CURSOR_APPEND_CLASS` | `jsed-ui-ew` | `jsed-crs-append` |
| `CURSOR_PREPEND_CLASS` | `jsed-ui-bw` | `jsed-crs-prepend` |
| `CURSOR_INSERT_AFTER_CLASS` | `jsed-ui-ia` | `jsed-crs-insert-after` |
| `CURSOR_INSERT_BEFORE_CLASS` | `jsed-ui-ib` | `jsed-crs-insert-before` |

## Files to change

1. **`packages/jsed/src/lib/constants.ts`** — update the string values (the constant names stay the same)
2. **`packages/jsed/src/styles/jsed-defaults.css`** — update all CSS selectors that reference the old class names

## How to verify

1. `task check` — type checks pass
2. `task test` — all tests pass (the tests import the constants, so they'll pick up the new values automatically)
3. Grep the jsed package for the old class names (`jsed-ui-ew`, `jsed-ui-bw`, `jsed-ui-ia`, `jsed-ui-ib`) — should return zero results

## Context

See `packages/jsed/docs/vocabulary.md` under **Cursor state** for the CURSOR_STATE vocabulary (CURSOR_APPEND, CURSOR_PREPEND, CURSOR_INSERT_AFTER, CURSOR_INSERT_BEFORE).

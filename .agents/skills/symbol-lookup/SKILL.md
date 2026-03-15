---
name: symbol-lookup
description: >
  Look up code symbols using the jcodemunch MCP server. Use when the user
  references a specific symbol (function, method, class, type, interface,
  constant, variable) by name and wants to understand, find, navigate to,
  or modify it. Triggers on patterns like: "what does X do", "where is X
  defined", "show me X", "find references to X", "how does X work",
  mentioning a PascalCase or camelCase identifier as the subject of a
  question, or starting with "In X, ..." where X is a symbol name.
---

# Symbol Lookup via jcodemunch

Use jcodemunch MCP tools to resolve symbol references. This is faster and more precise than grep/glob for finding definitions, signatures, and usage.

## Repo identifiers

- Monorepo: `local/@oneput-76a41cf1`
- jsed sub-index: `local/jsed-2fd72aec`

Default to the monorepo. Use the jsed sub-index when the question is clearly about jsed internals.

## Lookup workflow

1. **Find the symbol** — `search_symbols` with the symbol name as the query. Add `kind` filter (function/class/method/type/constant) if obvious from context.
2. **Get details** — Use `get_context_bundle` (preferred) or `get_symbol` with the `symbol_id` from search results. `get_context_bundle` includes the file's imports, giving enough context to understand dependencies.
3. **Find usage** — If the user asks "where is X used" or "what calls X", use `find_references` with the identifier name.
4. **Find importers** — If the user asks "what imports this file", use `find_importers` with the file path.
5. **Browse a file** — If you need to see all symbols in a file, use `get_file_outline`.

## Keeping the index fresh

Re-index once at the start of each session (before the first lookup) using `index_folder`:

- Monorepo: `path: "/Users/danb/projects/@oneput"`, `incremental: true`
- jsed only: `path: "/Users/danb/projects/@oneput/packages/jsed"`, `incremental: true`

Incremental indexing is fast — it only re-indexes changed files.

If a symbol is not found but you believe it exists, re-index first, then retry before falling back to Grep/Glob.

## Tips

- `search_symbols` matches against name, signature, summary, and docstring — use natural terms.
- After getting a symbol via jcodemunch, you can use `Read` to see the full file if broader context is needed.

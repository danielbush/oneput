---
name: jcodemunch
description: "Code search and exploration using jcodemunch-mcp via `bunx mcporter`. TRIGGER when: reading code, exploring a codebase, looking up functions/classes/symbols, finding where something is defined or used, understanding how files relate, navigating unfamiliar code, checking what depends on something, investigating imports, tracing call chains, orienting on a repo, answering 'how does X work', 'where is X defined', 'what calls X', 'what would break if I change X', 'show me the code for X', searching across multiple files or repos, or any task that benefits from symbol-aware code intelligence beyond simple grep. Prefer this over raw file reads when exploring code structure, relationships, or usage patterns."
---

# jcodemunch via mcporter

Query jcodemunch-mcp indexed codebases using `bunx mcporter call` and `bunx mcporter list`. This avoids loading the full MCP server into the agent's context while still accessing all of jcodemunch's code intelligence.

## Prerequisites

jcodemunch-mcp must be running (either as a configured MCP server or reachable via stdio). Repos must be indexed before querying — use `index_folder` or `index_repo` to index first.

## How to call

All calls go through mcporter's stdio transport:

```bash
# List available tools
bunx mcporter list --stdio "uvx jcodemunch-mcp"

# Call a tool (function-call syntax)
bunx mcporter call --stdio "uvx jcodemunch-mcp" 'list_repos()'

# Call with arguments
bunx mcporter call --stdio "uvx jcodemunch-mcp" 'search_symbols(repo: "jsed", query: "parse")'

# JSON output for structured processing
bunx mcporter call --stdio "uvx jcodemunch-mcp" 'list_repos()' --output json
```

The `--stdio "uvx jcodemunch-mcp"` flag tells mcporter to launch jcodemunch as a stdio subprocess.

## Tool reference

### Orientation (start here on an unfamiliar repo)

| Tool | Purpose | Example |
|------|---------|---------|
| `list_repos()` | List all indexed repos | `'list_repos()'` |
| `suggest_queries(repo)` | Entry-point files, top keywords, example queries | `'suggest_queries(repo: "jsed")'` |
| `get_repo_outline(repo)` | High-level: dirs, file counts, languages, symbol counts | `'get_repo_outline(repo: "jsed")'` |
| `get_file_tree(repo)` | File tree, optionally filtered by path prefix | `'get_file_tree(repo: "jsed", path_prefix: "src/utils")'` |

### Symbol search & inspection

| Tool | Purpose | Example |
|------|---------|---------|
| `search_symbols(repo, query)` | Search across repo by name, signature, summary | `'search_symbols(repo: "jsed", query: "parse", max_results: 5)'` |
| `get_file_outline(repo, file_path)` | All symbols in a file with signatures | `'get_file_outline(repo: "jsed", file_path: "src/main.ts")'` |
| `get_symbol_source(repo, symbol_id)` | Full source of a symbol | `'get_symbol_source(repo: "jsed", symbol_id: "src/main.ts::parseToken")'` |
| `get_context_bundle(repo, symbol_id)` | Source + imports, deduped. Use `output_format: "markdown"` for paste-ready | `'get_context_bundle(repo: "jsed", symbol_id: "src/main.ts::parseToken", output_format: "markdown")'` |
| `get_related_symbols(repo, symbol_id)` | Heuristic clustering: co-location, shared importers, name overlap | `'get_related_symbols(repo: "jsed", symbol_id: "src/main.ts::parseToken")'` |

### Text search

| Tool | Purpose | Example |
|------|---------|---------|
| `search_text(repo, query)` | Full-text search across file contents, supports regex | `'search_text(repo: "jsed", query: "TODO", context_lines: 2)'` |

### Dependency & impact analysis

| Tool | Purpose | Example |
|------|---------|---------|
| `get_dependency_graph(repo, file)` | File-level import graph, up to 3 hops | `'get_dependency_graph(repo: "jsed", file: "src/main.ts", direction: "both")'` |
| `find_importers(repo, file_path)` | What files import a given file | `'find_importers(repo: "jsed", file_path: "src/utils/helpers.ts")'` |
| `find_references(repo, identifier)` | Where is an identifier used | `'find_references(repo: "jsed", identifier: "parseToken")'` |
| `check_references(repo, identifier)` | Is an identifier referenced anywhere (dead-code detection) | `'check_references(repo: "jsed", identifier: "oldFunction")'` |
| `get_blast_radius(repo, symbol)` | All files affected by changing a symbol | `'get_blast_radius(repo: "jsed", symbol: "parseToken")'` |
| `get_class_hierarchy(repo, class_name)` | Inheritance tree (ancestors + descendants) | `'get_class_hierarchy(repo: "jsed", class_name: "BaseParser")'` |

### Indexing

| Tool | Purpose | Example |
|------|---------|---------|
| `index_folder(path)` | Index a local folder | `'index_folder(path: "/Users/danb/projects/myrepo")'` |
| `index_repo(url)` | Index a GitHub repo | `'index_repo(url: "owner/repo")'` |
| `index_file(path)` | Re-index a single file (faster than full re-index) | `'index_file(path: "/Users/danb/projects/myrepo/src/changed.ts")'` |

### Diffing

| Tool | Purpose | Example |
|------|---------|---------|
| `get_symbol_diff(repo_a, repo_b)` | Diff symbol sets between two indexed snapshots | `'get_symbol_diff(repo_a: "jsed-main", repo_b: "jsed-feature")'` |

## search_symbols detail levels

The `detail_level` parameter controls result verbosity:

- **`compact`** — id/name/kind/file/line only (~15 tokens each). Best for broad discovery.
- **`standard`** (default) — includes signatures and summaries.
- **`full`** — inlines source code and docstrings. Equivalent to search + get_symbol_source in one call.

Use `token_budget` instead of `max_results` when you want to pack as many results as possible into a fixed context window.

## Workflow patterns

### "What is this repo?"
1. `list_repos()` — find the repo identifier
2. `suggest_queries(repo)` — get entry points and example queries
3. `get_repo_outline(repo)` — directory structure and language breakdown

### "Where is X used?"
1. `find_references(repo, identifier: "X")` — import-level references
2. `search_text(repo, query: "X")` — full-text occurrences (catches string refs, comments)

### "What would break if I change X?"
1. `get_blast_radius(repo, symbol: "X")` — confirmed + potential affected files
2. `get_dependency_graph(repo, file: "...", direction: "importers")` — who depends on this file

### "Show me everything about function X"
1. `get_context_bundle(repo, symbol_id: "...", output_format: "markdown")` — source + imports, paste-ready

## Repo identifiers

Repos are identified by their display name (e.g., `"jsed"`, `"@oneput"`) or their full identifier (e.g., `"local/jsed-2fd72aec"`). Use `list_repos()` to discover available identifiers.

## Batch operations

Several tools support batch mode for efficiency:
- `get_file_outline` — pass `file_paths: [...]` instead of `file_path`
- `get_symbol_source` — pass `symbol_ids: [...]` instead of `symbol_id`
- `find_importers` — pass `file_paths: [...]` instead of `file_path`
- `find_references` — pass `identifiers: [...]` instead of `identifier`
- `check_references` — pass `identifiers: [...]` instead of `identifier`

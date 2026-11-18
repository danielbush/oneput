# HTML sink scan

A sink is a place where a string becomes live HTML. Examples include
`innerHTML`, `insertAdjacentHTML`, HTML parsers and Svelte `{@html}` blocks.

SAFE_HTML requires all HTML that reaches the page to use the checked path.
This scan stops a human or an agent from adding an unchecked sink. It checks
source files during `task check` and in CI. It does not run at runtime.

Run from the repo root:

```sh
task check:html-sinks
```

KaTeX output goes through safe-html `sanitiseHtml` with the `"math"` policy,
then `insertSafeHtml` copies the checked nodes into the page.
The demo uses fixed compiler limits and paint containment. See the
[math policy contract](../../packages/safe-html/README.md).

## Reviewed exceptions

First, use the checked path if possible. If a sink must remain, review it and
add an entry to `exceptions` in [exceptions.mjs](./exceptions.mjs). Set `path`
to the path from the repo root. Copy `kind` and `source` from the scan report.
Set `owner` to the name of the enclosing function declaration when one is
present. Give a `reason` that states why the operation is safe.

A valid reason names the check before insertion, the policy after inert
parsing, or why the operation is not an HTML sink. Convenience is not a valid
reason. Each entry permits one matching occurrence. An unused entry fails the
scan. Add a file to `fixturePaths` only after review of its raw test fixtures.

## Limits

An unresolved property write on a known HTML sink receiver needs an exception.
Object spreads or duplicate keys make a destructured property name unresolved.
The scan is a source check, not proof of runtime safety. It cannot resolve
names or receiver types that only exist at runtime, does not follow values
across function calls, and does not see code created at runtime.

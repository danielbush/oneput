# jsed

Convert, navigate and edit html docs using 2br (2nd brain) constructs such as i-aliases. Convert takes markdown files (used in the prototype project apps/fold) and converts them and the 2br constructs into html that can then be navigated and edited. The conversion is one-way, there is no going back.

- `convert`
  - convert existing markdown files which is a format used in an early prototype of the 2br system
- `navigate`
  - the idea is to take html (including markdown converted by `convert`) and be able to navigate it or the outline or any other technique that make navigating potentially large documents easier
- `modify`
  - modify the structure of the html document
- `extend`
  - we want to not just navigate html, we want to extend it; think: checkboxes with state on list items
- `edit`
  - when we get to text, we want to be able to edit it
- `serialize`
  - when we save we need to generate a version of the edited content without any any temporary artifacts from the navigator
- `load` / `unload`
  - load and unload an html doc within the browser environment; be able to leave the html the way we found it if this program unloads

See:

- [CODE.md](./CODE.md) - how code and tests are organised
- [DEFINITIONS.md](./DEFINITIONS.md) - key definitions and behaviours of the systems
- [ISSUES.md](./ISSUES.md) - issues found along the way

## Usage

Run a dev server to access `src/examples/` or similar:

```sh
bun run dev
```

## Build

Build a bundle in dist/ (TODO: not productionized yet).

```sh
bun run build
```

Adds a cli to `dist/`.

```sh
bun run build:cli
```

## Testing

Tests

```sh
bun run test:watch
```

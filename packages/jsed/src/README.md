# jsed

STATUS: Apr-2024 This code is under development. Not ready for use yet. Come back in a few months.

The core library behind jsed. To use the editor you need jsed-ui which has this code as a dependency.

Some of the key things the core library handles:

- `navigate`
  - the idea is to take html (including markdown converted by `convert`) and be able to navigate it or the outline or any other technique that make navigating potentially large documents easier
- `modify`
  - modify the structure of the html document
- `extend`
  - we want to not just navigate html, we want to extend it; think: checkboxes with state on list items
- `edit`
  - when we get to text, we want to be able to edit it
- `serialize`
  - when we save we need to generate a version of the edited content without any any temporary artifacts from navigation / editing
- `load` / `unload`
  - load and unload an html doc within the browser environment; be able to leave the html the way we found it if this program unloads
- `convert`
  - convert existing markdown files which is a format used in an early prototype of the 2br system (a separate piece of software that motivated the creation of jsed and jsed-ui)
  - convert takes markdown files (used in the prototype project "fold") and converts them and the 2br constructs into html that can then be navigated and edited. The conversion is one-way, there is no going back.

See:

- [CODE.md](./CODE.md) - how code and tests are organised
- [architecture.md](../../../docs/architecture.md) - architecture, key definitions and behaviours
- [ISSUES.md](./ISSUES.md) - issues found along the way

## Usage

This is a library. It's intended to be used as dependency by jsed-ui.

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

## How it works

- document is initialized using `src/app/start.ts`
  - some modifications may occur at this point such as `tokenizeImplicitLine`
- at this point the user can use `src/Nav.ts` to navigate the document
- `Nav#FOCUS` on each F_ELEM as we navigate
- the text nodes of the focused F_ELEM are tokenized using `tokenize` in `src/Nav.ts`
  - currently `tokenize` tokenizes the LINE associated with the F_ELEM which is all text nodes and text nodes of inline child nodes of the F_ELEM
  - TBC: we know that if we `tokenize` all text in a large doc we will run into performance issues in the browser; so we may need to consider untokenizing text once the user has navigated past the F_ELEM . However if they edit the text, we may leave it tokenized.
- if the user stops to edit the tokneized text, they are using the cursor in `src/lib/cursor.ts`

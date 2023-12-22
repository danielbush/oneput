# sbr-hyper-core

Convert, navigate and edit html docs using 2br (2nd brain) constructs such as i-aliases. Convert takes markdown files (used in the prototype project apps/fold) and converts them and the 2br constructs into html that can then be navigated and edited. The conversion is one-way, there is no going back.

- `convert`
  - convert existing markdown (as used by the author in `apps/fold`)
- `navigate`
  - the idea is to take html (including markdown converted by `convert`) and be able to navigate it
- `modify`
- `extend`
  - we want to not just navigate html, we want to extend it; think checkboxes with state on list items
- `edit`
  - when we get to text, we want to be able to edit it
- `serialize`
  - when we save we need to generate a version of the edited content without any any temporary artifacts from the navigator
- `load` / `unload`
  - load and unload an html doc; be able to leave the html the way we found it if this program is exited

See:

- [CODE.md](./CODE.md) - how codes and tests are organised
- [DEFINITIONS.md](./DEFINITIONS.md) - key definitions and behaviours of the systems
- [ISSUES.md](./ISSUES.md) - issues found along the way

## Synopsis

Build a bundle in dist/ (TODO: not productionized yet).

```sh
bun run build
```

Tests

```sh
bun run test:watch
```

Run a dev server to access `src/examples/` or similar:

```sh
bun run dev
```

### Examples (WIP)

`src/examples` is currently not in version control and is a place where I am building jsed to support existing 2br content (Dec-2023).  At some point we'll create public examples.

Current examples I'm working on:

```sh
cp -i /Users/danielbush/work/2br-danb2/tmp.md src/examples/tmpmd/index.md
bun run convert -- src/examples/tmpmd/index.md >src/examples/ng-ml/index.html

cp -i ~/work/2br-danb2/.fold/idable/6058d8eb-5ef6-4c22-8bb4-2a15aa2252a7/content.md src/examples/ng-ml/index.md
bun run convert -- src/examples/ng-ml/index.md >src/examples/ng-ml/index.html
```

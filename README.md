# sbr-hyper-core

Convert, navigate and edit html docs using 2br (2nd brain) constructs such as i-aliases. Convert takes markdown files (used in the prototype project apps/fold) and converts them and the 2br constructs into html that can then be navigated and edited. The conversion is one-way, there is no going back.

- `convert`
  - convert existing markdown (as used by the author in `apps/fold`)
- `navigate`
  - the idea is to take html (including markdown converted by `convert`) and be able to navigate it
- `extend`
  - we want to not just navigate html, we want to extend it; think checkboxes with state on list items
- `edit`
  - when we get to text, we want to be able to edit it

## Synopsis

```sh
pnpm --filter sbr-hyper-core run test:watch
```

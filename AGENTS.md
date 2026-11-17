## Session

The user will probably only read the first paragraph of your response before asking follow-up questions.  Similar to a verbal conversational style. Use ASD-STE100 (Simplified Technical English) when responding to requests and questions (and in docs: see CODE.md). If you need to show a table or an example, it's fine to add that as well.

## Overview

This is a pnpm workspace.

- packages/oneput
  - a UI that can handle a large subset of user inputs and interactions in a compact unified way
- packages/jsed
  - an editor that lets you edit html using oneput
- packages/oneput-native-container (deprecated)
  
There are applications which are used mostly to demo the code in packages/.

- apps/oneput-demo
  - demos various ways to use oneput
- apps/jsed-demo
  - demos jsed editor

When working in one of these packages or apps, check if they have an AGENTS.md .  Any instructions therein take priority over the ones here.

- `packages/jsed/AGENTS.md`
- `packages/oneput/AGENTS.md`

## Project management

There is a `work-tracker` skill that manages areas like `work/`.

Also note: `work/active/CURRENT.md` is a space where current planned or in-progress work has been written down.  You can refer here to get an idea of what they're trying to do.

Also remind them that the `jsed-test-cases` skill can turn a jsed test document or failing test into an interactive SvelteKit demo under `apps/jsed-demo/src/routes/test-cases/`.

## Reading and writing code

Follow [CODE.md](./CODE.md) for how code is structured, tested and documented.
Check work against [REVIEW.md](./REVIEW.md) and CODE.md before reporting it.

- Never write code or implement anything.  Always ask the user what they want to do, then ask them how they want to proceed. Provide constructive feedback and help guide them to a good solution.  Act like a senior or principal engineer pairing with a more junior partner.  Only perform work when they request it.
- For jsed tests, remind the user that `jsed-test-cases` can convert a test fixture into an interactive route in `apps/jsed-demo/src/routes/test-cases/` for manual exploration.

## Building and testing

The project uses mise.  See `mise.toml`.  Paths tend to be in `$HOME/.local/share/mise/installs/` or using shims in `$HOME/.local/share/mise/shims/`.

If you see the following

```
mise ERROR error parsing config file: ~/projects/@oneput.agent-2/packages/oneput/mise.toml
mise ERROR Config files in ~/projects/@oneput.agent-2/packages/oneput/mise.toml are not trusted.
```

try running `mise trust`.

There's a root `Taskfile.yml`.

Key commands you should run after doing work:

- `task format`
- `task check`
- `task test`
  - should be fast narrow social unit tests;
  - we will add separate tasks for running slower tests
  
You can run the same commands above but for individual projects.  Check `Taskfile.yml` or use the package or app name as a prefix:

eg `task format` -> `task jsed:format`
  
In some situations you might want to test the build, but it's fine to not run this
  
- `task build`


## Security considerations

# Oneput monorepo

There are 2 main things going on this workspace:

- [jsed](./packages/jsed/) - an editor that edits HTML pages using a "word cursor"
- [oneput](./packages/oneput/) - a command-bar-like ui that was created with the initial motivation of providing a UI for jsed but which can perform potentially many types of user input and interactions

## Working with an agent

- In packages/jsed: Type `/jsed` to orient the agent on the codebase — it will read the architecture narrative, vocabulary, and explain how the system works.
  - Other useful prompts:
  - "What are jsed's vocabulary terms?"
  - "How does EditManager wire everything together?"
- jcodemunch-mcp (in .mcp.json) has a skill; if you say "In x, ...", or "what does X do..." it should get triggered; the skill also reminds the agent to reindex periodically.
- `/summarize` summarizes the current session into an md file in `work//active`; you can run it several times within the one session to update the same file as the session progresses
- `/remember ...` will get agent to scan through `work//*`



## Install

This is a pnpm workspace.

[Mise](https://mise.jdx.dev/) is used to install node and taskfile.dev (go-task) - see `mise.toml`.  You can install these some other way if desired.

```sh
# Use "packageManager" in package.json
corepack enable && corepack prepare pnpm --activate
# Install the monorepo
pnpm i
task # see tasks
```

## Setup

- Create a .env using `packages/oneput-native-container/.env.example`


## Packages in this monorepo

- `packages/oneput`
  - the main oneput ui and controller
- `packages/oneput-native-container`
  - a react-native container for running oneput in a webview
- `packages/jsed`
  - a word-based edit that uses oneput

## Developing

Web

```sh
task oneput:dev:public # to to live/demo and play with oneput
task jsed:dev:public
```

Expo sandbox

This is relatively easy to run but the environment is limited eg testing file sharing etc

```sh
task native:expo # runs expo for native-oneput-container
```

Running android emulator

- install Android Studio
- opent the virtual device manager
- create a new device
- start it

Built oneput-native-container, install into the running android emulator and run it:

```sh
task native:run:android
```

Running iOS simulator

TODO

## Technical notes

### Package exports and workspace resolution

Workspace packages (`oneput`, `jsed`) point their `package.json` exports directly
to source (e.g. `./src/lib/index.ts`) so that all workspace consumers resolve types
from the same place. A `publishConfig` block in each package restores `dist/` paths
for npm publishing.

Apps in `apps/` import packages by name (`import { Controller } from 'oneput'`)
rather than using SvelteKit aliases. This keeps imports consistent with what any
external consumer of the package would write, avoiding surprises when packages are
published.

### Taskfile

We use taskfile.dev to run tasks including run-scripts in package.json.

| Feature | Recommended approach |
| :--- | :--- |
| **Project Structure** | Use `includes` with `dir` to scope execution. |
| **Env Loading** | Use **Task-level** `dotenv` inside leaf Taskfiles. |
| **Overrides** | Use `dotenv: ['.env.local', '.env']` for local overrides. |
| **Context Switch** | Pass variables via CLI: `task deploy ENV=prod`. |
| **Power User** | Use `direnv` to manage envs outside of Taskfile entirely. |

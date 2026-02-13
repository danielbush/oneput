# Oneput monorepo

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

### Dual type resolution in workspace apps

Apps in `apps/` (e.g. `jsed-demo`) use SvelteKit aliases to import directly from
package source for a fast dev experience:

```js
// svelte.config.js
alias: {
  $oneput: '../../packages/oneput/src/lib/index.ts',
  $jsed:   '../../packages/jsed/src/index.ts',
}
```

When an app imports a type like `Controller` via `$oneput`, TypeScript resolves it
from **source** (`packages/oneput/src/lib/...`). But if the app also depends on
`jsed` (which imports `Controller` from the `"oneput"` package by name), TypeScript
resolves that through oneput's `package.json` exports — which originally pointed to
**dist** (`packages/oneput/dist/...`).

Two separate declarations of the same type are not assignable to each other,
especially when classes have `private` members (structural compatibility fails).

**Fix:** oneput's `package.json` points `"types"` and `exports["."].types` to
source (`./src/lib/index.ts`) so all workspace consumers resolve to the same
place. A `publishConfig` block restores the `dist/` paths for npm publishing.

### Taskfile

We use taskfile.dev to run tasks including run-scripts in package.json.

| Feature | Recommended approach |
| :--- | :--- |
| **Project Structure** | Use `includes` with `dir` to scope execution. |
| **Env Loading** | Use **Task-level** `dotenv` inside leaf Taskfiles. |
| **Overrides** | Use `dotenv: ['.env.local', '.env']` for local overrides. |
| **Context Switch** | Pass variables via CLI: `task deploy ENV=prod`. |
| **Power User** | Use `direnv` to manage envs outside of Taskfile entirely. |

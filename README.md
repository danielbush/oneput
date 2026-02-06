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

Then we can run:

```sh
task native:run:android # runs android for native-oneput-container
```

Running iOS simulator

TODO

## Technical notes

### Taskfile

We use taskfile.dev to run tasks including run-scripts in package.json.

| Feature | Recommended approach |
| :--- | :--- |
| **Project Structure** | Use `includes` with `dir` to scope execution. |
| **Env Loading** | Use **Task-level** `dotenv` inside leaf Taskfiles. |
| **Overrides** | Use `dotenv: ['.env.local', '.env']` for local overrides. |
| **Context Switch** | Pass variables via CLI: `task deploy ENV=prod`. |
| **Power User** | Use `direnv` to manage envs outside of Taskfile entirely. |

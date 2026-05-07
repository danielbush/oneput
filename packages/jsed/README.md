# jsed

An editor that edits HTML pages using a "word cursor".

## Status

This is pre-alpha, not ready for prime time.

## Usage

The demo is in [apps/jsed-demo](../../apps/jsed-demo/)

```sh
task -t ../../Taskfile.yml jsed-demo:dev
```

## Using jsed with Oneput

jsed exposes the editor model from `@oneput/jsed` and the Oneput app integration from
`@oneput/jsed/ui/oneput/app`. The app integration expects the host project to provide
`@oneput/oneput`, so `@oneput/oneput` is a peer dependency of jsed.

Install both packages in a consuming project:

```sh
npm install @oneput/jsed @oneput/oneput
```

Then mount the jsed app through Oneput:

```svelte
<script lang="ts">
  import '@oneput/jsed/styles/jsed-defaults.css';
  import { JSED_APP_ROOT_ID } from '@oneput/jsed';
  import type { Controller } from '@oneput/oneput';
  import Anchor from '@oneput/oneput/shared/components/Anchor.svelte';
  import OneputController from '@oneput/oneput/shared/components/OneputController.svelte';
  import OneputCornerButton from '@oneput/oneput/shared/components/OneputCornerButton.svelte';
  import { icons, Root } from '@oneput/jsed/ui/oneput/app';
</script>

<div id={JSED_APP_ROOT_ID}>
  <Anchor>
    <OneputController run={(ctl: Controller) => Root.create(ctl)} />
  </Anchor>
  <OneputCornerButton icon={icons.Command} />
</div>
```

The core `@oneput/jsed` entry stays focused on editor behavior. The
`@oneput/jsed/ui/oneput/app` entry is the bridge that turns that behavior into a
Oneput app object.

See [Taskfile.yml](./Taskfile.yml) .

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

jsed exposes editor primitives and a small Oneput example app from
`@oneput/jsed`. The app integration expects the host project to provide
`@oneput/oneput`, so `@oneput/oneput` is a peer dependency of jsed.

Install both packages in a consuming project:

```sh
npm install @oneput/jsed @oneput/oneput
```

Then mount a `JsedDocument` through `JsedEditDocumentUI`:

```svelte
<script lang="ts">
  import '@oneput/jsed/styles/jsed-defaults.css';
  import { JSED_APP_ROOT_ID, JsedDocument, JsedEditDocumentUI, icons } from '@oneput/jsed';
  import type { Controller } from '@oneput/oneput';
  import Anchor from '@oneput/oneput/shared/components/Anchor.svelte';
  import OneputController from '@oneput/oneput/shared/components/OneputController.svelte';
  import OneputCornerButton from '@oneput/oneput/shared/components/OneputCornerButton.svelte';

  const run = (ctl: Controller) => {
    const root = document.querySelector('#editable-document') as HTMLElement;
    return JsedEditDocumentUI.create(ctl, {
      document: JsedDocument.create(root)
    });
  };
</script>

<div id={JSED_APP_ROOT_ID}>
  <main id="editable-document">
    <p>Edit this document.</p>
  </main>
  <Anchor>
    <OneputController {run} />
  </Anchor>
  <OneputCornerButton icon={icons.Command} />
</div>
```

`JsedEditDocumentUI` is a usable default and a copyable example. Copy it into a
host app when the host needs to own lifecycle, layout, saving, or custom editor
behavior.

See [Taskfile.yml](./Taskfile.yml) .

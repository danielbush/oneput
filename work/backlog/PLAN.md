# Plan: pull-based `toggleMenuItem` and `checkboxMenuItem`

## Outcomes

- **BindingsEditor:** remove `paint`. `whenFlagUI` is one `setMenu` again (`focusBehaviour: 'first'`). `onToggle` only assigns `whenIndex`. The row label updates without a second `setMenu`.
- **Keep** the current **stateless** `toggleMenuItem` (`index` + `onToggle`; caller rebuilds via `menu()` / `invalidate` / `setMenu`). Frame neighbourhood rows already work this way after the title-node patch was removed. Do not replace it in this work.
- **Add** a **pull** toggle factory (new name, e.g. `pullToggleMenuItem`) that mounts a widget, reads `get()`, paints a host it owns, and optionally `subscribe`s. BindingsEditor uses this one.
- **`checkboxMenuItem`:** make it pullable (same widget contract as the pull toggle). Replace construct-time `checked` with `source: Pull<boolean>`. Update Settings, Katex, and jsed. Katex still `invalidate`s for the **preview**, not for the box.

## Keep stateless and add pull?

Yes. Two factories, two contracts.

| | Stateless `toggleMenuItem` | Pull `pullToggleMenuItem` |
| --- | --- | --- |
| Display | Snapshot `index` in Flex `textContent` | Widget paints from `get()` |
| After click | Caller rebuilds the item | Widget paints again from `get()`; siblings paint on `subscribe` |
| Use when | Menu already rebuilds (Frame catalog + `invalidate`) | Must not rebuild (BindingsEditor `setMenu` once) |
| Do not | Write the title DOM | Snapshot `index` into Svelte text |

Do not overload one function with `index | source`. The BindingsEditor bug started as a hybrid (snapshot + DOM write). Checkbox has no working stateless+rebuild story (Settings never rebuilds; it flips `input.checked`). So checkbox becomes pull-only; toggle keeps both.

## Goal

Mounted pull widgets own their host node and read live state. Stateless `toggleMenuItem` stays for callers that already rebuild. BindingsEditor stops rebuilding the whole menu to move one label.

## Why

A menu item factory snapshots `index` / `checked` into Flex `textContent` / `attr.checked`. Sibling rows and later rebuilds fight Svelte keyed children (`item.id`, title `…-title`). Writing `getElementById().textContent` made that worse: it stole Svelte’s text node.

`DateTimeToggle` / `TimeDisplay` already show the solid pattern: `onMount` on a host, paint into a node the widget owns, tear down on unmount.

`invalidate` stays for **menu shape** (which rows exist, preview HTML, filter). It is not how a Hidden/Shown label or a checkbox tick moves.

## Widget contract

One pull source:

```ts
type Pull<T> = {
  get: () => T;
  subscribe?: (onChange: () => void) => () => void;
};
```

**Toggle:** `Pull<number>` (index into `values`).
**Checkbox:** `Pull<boolean>`.

Behaviour:

1. **Mount** on an `FChild` host (title for toggle; the `input` for checkbox). Create a child node the widget owns. Do not set Svelte `textContent` on that host.
2. **Paint** from `get()` on mount.
3. **Click** (row action): compute next value, call `onToggle` / `action`, then paint from `get()` again. The write in the caller must be visible to `get()` before that second paint (sync).
4. **Subscribe** (optional): on notify, paint from `get()`. This is how a row you did not click stays correct.
5. **Destroy** unsubscribes and removes the host child.

Use `FChild` `onMount`, not Flex’s mount map. Flex only runs `onMount` once on the parent Flex instance.

`get()` must read **live** state. Do not close over a selected node id or a copied boolean from `menu()` time. Menu rows keep stable ids; selection `invalidate` reuses the FChild and will **not** remount the widget.

### Click then pull is enough for one row

BindingsEditor only has one toggle. `onToggle` assigns `whenIndex`. `get: () => whenIndex`. No `subscribe`. No second `setMenu`.

### Subscribe is required when another write must move this row

A second mounted pull row that did not receive the click only moves if it `subscribe`s. Frame All / Incoming / Outgoing do **not** need that in this work: they stay on stateless `toggleMenuItem` + `invalidate`.

## Oneput API sketch

Stateless (keep):

```ts
toggleMenuItem({
  id, label, values,
  index: number,
  onToggle: (index: number) => void,
  left, bottom
})
```

Pull (add toggle; change checkbox):

```ts
pullToggleMenuItem({
  id, label, values,
  source: Pull<number>,
  onToggle: (index: number) => void,
  left, bottom
})

checkboxMenuItem({
  id, textContent,
  source: Pull<boolean>,
  action: (ctl, checked: boolean) => void,
  closeMenuOnAction
})
```

Pull display stays out of the Flex tree (no snapshot `index` / `checked` on the host). Stateless toggle still snapshots `index` into `textContent`.

Optional helper `cell<T>(initial)` for local values that need `subscribe` (or for callers who prefer `set` over a closure):

- `get` / `set` / `subscribe`
- `set` notifies listeners

Not required for BindingsEditor if `get` closes over `whenIndex`. Useful for tests and for Frame if graph events do not exist yet.

Paint into a **span** (toggle) or set `input.checked` **property** (checkbox). Never `titleElement.textContent` on a Svelte-managed text node.

Keyboard catalog actions that bypass the widget must update whatever `get()` reads. If other mounted rows must move, notify `subscribe` (or keep `invalidate` only when the **set of rows** changes).

## BindingsEditor

Revert `whenFlagUI` to one `setMenu` with `focusBehaviour: 'first'`.

```ts
let whenIndex = BindingsEditor.whenFlagToIndex(currentWhen);

pullToggleMenuItem({
  id: 'menuOpen',
  label: 'Menu open',
  values: [...BindingsEditor.whenValues],
  source: { get: () => whenIndex },
  onToggle: (nextIndex) => {
    whenIndex = nextIndex;
  },
  left: (b) => [b.icon(this.icons.WhenFlag)]
});

// OK still reads whenIndex
```

No `paint`. The widget owns the label. OK/Cancel stay ordinary `stdMenuItem`s.

## Use cases

### Stateless `toggleMenuItem` (keep as-is)

Frame All / Incoming / Outgoing, Neighbors on focus, canvas interaction, text-to-node. No change in this work. `invalidate` on those actions can stay.

### Pull toggle (`pullToggleMenuItem`)

| Site | Coupled rows? | Pull enough? |
| --- | --- | --- |
| **BindingsEditor `whenFlagUI`** | No | Yes. `get` + `onToggle` only. Remove `paint`. |

Frame neighbourhood / focus-reveal / interaction / text-to-node stay on **stateless** `toggleMenuItem`. A later change could move All / Incoming / Outgoing to pull + a shared graph `subscribe` (Frame has no graph listener today). Not this work.

### `checkboxMenuItem`

| Site | Coupled rows? | Why `invalidate` today | Pull enough? |
| --- | --- | --- | --- |
| **Settings `useTestService`** | No | None | Yes. `get: () => this.useTestService`. Matches current “click flips the box” behaviour, without `getElementById` as the design. |
| **Katex display mode** | No | Rebuild **preview** (`innerHTMLUnsafe`) + help | Checkbox: yes, self-paint. **Keep `invalidate`** for the preview pane. The checkbox widget must survive that rebuild (stable id → no remount); `get()` reads `this.displayMode`. |
| **jsed legacy / modern element indicator** | Independent flags (not exclusive in the catalog) | `invalidateMenu` after editor write, including keyboard `action` | Self-paint for a click on that row. Keyboard `action` must notify `source.subscribe` **or** keep `invalidate` if other menu copy depends on the flag. If the two boxes should never both be on, that is a new product rule: then they need a shared subscribe, like Frame All/Outgoing. |

No other call sites in `@2br` or Oneput (skill examples only).

## Is toggle + checkbox pull enough?

**Yes** for this work’s call sites: BindingsEditor on `pullToggleMenuItem`, checkboxes on pull `source`, Frame still on stateless `toggleMenuItem`.

- Katex still `invalidate`s for the preview, not for the box.
- jsed keyboard `action` must notify `source.subscribe` **or** keep `invalidate`.

**Not** a substitute for:

- Katex preview HTML;
- Frame row **presence** (`canShowMenuItem` / `hasIncident` / maximize);
- filter / `menu()` identity;
- Confirm’s `onMount` to stash a button and `focus()` (different problem).

Do not turn `stdMenuItem` into a pull widget.

## Implementation order

1. **Oneput:** `Pull<T>` (+ optional `cell`). Toggle widget modelled on `DateTimeToggle`. Add `pullToggleMenuItem`; leave `toggleMenuItem` unchanged. Tests: mount, click cycles `get()`, second item with shared `subscribe` updates without rebuild; destroy unsubscribes.
2. **Oneput:** `checkboxMenuItem` becomes pull-only; set `.checked` property on an input the widget owns (not Svelte `attr.checked`).
3. **BindingsEditor:** remove `paint`; one `setMenu`; use `pullToggleMenuItem` with `get` / `onToggle` on `whenIndex`.
4. **Checkbox call sites:** Settings, Katex (keep preview `invalidate`), jsed (keyboard notify vs `invalidate`).
5. **Skill + JSDoc:** document both toggle factories. Pull: pass `get` (and `subscribe` when another write must move this row). Stateless: still rebuild after `onToggle` if the label must change.
6. **Verify:** BindingsEditor when-flag without menu rebuild; Settings checkbox; Katex preview still follows display mode; Frame neighbourhood still works on **stateless** `toggleMenuItem`.

Do not migrate Frame to pull in this work.

## Risks

- Stable menu ids + no remount: stale `get` if it captured `selectedNode` at `menuItem()` time. Require live getters.
- Flex parent `onMount` will not run for title children. Use `FChild`.
- Katex `invalidate` after display-mode click must not wipe widget state; `get()` is the source of truth after remount-less reuse.
- jsed keyboard `action` duplicates the checkbox `action`; both must write the same store.

## Out of scope

- Handle maps / `setIndex` from outside (push).
- Changing Flex keyed-each strategy.
- Frame core event bus (harness notifier is enough for the first cut).
- Making the Katex preview a pull widget.
- Migrating Frame toggles from stateless `toggleMenuItem` to pull.

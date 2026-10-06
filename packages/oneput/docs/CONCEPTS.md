# concepts and vocabulary

## actions and action providers (PROVIDER) and PROVIDER_PATTERN

- PROVIDER
  - an ActionProvider or thing that implements the AppActionProvider interface

- PROVIDER_PATTERN
  - the key idea is that we collate actions that we want to expose in oneput in
    one place, define what bindings they have and whether they have a menu item
    and what that menu item looks like.
  - `ActionProviderEntry` type represents action, bindings and menu item; conditionals could be defined here eg canShowMenuItem
  - The provider's role is a collator; if you start mixing state and
    implementation logic into it directly, you run the risk of creating less clear
    code. Consider injecting an adapter that exposes the actions and conditions
    without leaking the business logic for them.
  - The provider does not own AppObject lifecycle stuff like menu id, focus
    behavior, layout title, prompt, or child mode setup.
  - Helps to declutter `.menu` and `.actions` in the AppObject
  - To specify whether the menu is available
    - `ActionProviderEntry` defines `canShowMenuItem`
  - TBD: specify whether actions are available
  - see `OneputActionProvider` and `JsedActionProvider` as examples

### PROVIDER_WHEN - When to add a PROVIDER / use the PROVIDER_PATTERN

An app that uses Oneput has up to three parts. Start with two, and add the
third only when you need it.

1. **Model**: the app logic. Plain TS that does not know about Oneput. It holds
   the state and the rules, such as "can we insert now?". Test it with
   nullables, without Oneput.
2. **AppObject**: the UI adapter over the model. It knows about the app logic,
   because it holds the model and calls it. But it does not contain the rules.
   It turns model state into menu, layout and actions, and it turns user events
   into model calls.
3. **PROVIDER** (optional): collates the actions. For each action it declares
   the binding, the menu row and the predicates (`canShowMenuItem`). It takes
   the model and points to it. It does not hold rules or state.

Predicates such as `canShowMenuItem` are pointers into the model, for example
`() => editor.isEditing()`. The same applies to `action`. A predicate never holds
the rule itself. Thus a PROVIDER stays a collator, even when an action has
conditions.

Add a PROVIDER when one or more of these is true:

- There are many actions, and they make `AppObject.actions` and `menu()` hard
  to read.
- Each action appears in more than one form: a key binding, a menu row, and a
  condition for when to show it.
- More than one AppObject or mode shows a different subset of the same actions
  (`filter()`).

Example where a PROVIDER is justified: `JsedActionProvider`. It has about 50
editor actions. Most of them have a key binding and a menu row, and many show
only in some states (`canShowMenuItem: () => editor.isEditing()`). The model is
`Editor`, and the provider only points into it ("the ui shouldn't decide
anything for the editor"). `JsedUI` then builds its menu as a list of action
ids: `provider.getMenuItems([JsedAction.UNDO, JsedAction.REDO])`.

Example where a PROVIDER is not justified: `KatexDemo.ts` (apps/oneput-demo).
It has two actions and one AppObject, so `AppObject.actions` is enough. It
still models each thing it exposes to Oneput as an action:

- `TOGGLE_DISPLAY_MODE`, with its own binding.
- `OneputAction.SUBMIT`, with no binding. An app action with a default action's
  id replaces what that default does while the app runs, and keeps the default
  binding. So a rebind still works, and the placeholder still shows the key.
  The Send button runs the same action.

It still has a model and an AppObject, in one file because the demo is small:

- `KatexFormula` (model) compiles the source, knows if it is valid, decides
  `canInsert`, and inserts the formula (block or inline). Inserting is app
  logic, so it is in the model. `insert()` checks `canInsert` itself, so no
  caller can skip the check. Its state is one Svelte store (plain JS, no
  compiler). It notifies on each change through `subscribe`, and the UI reads
  `current`.
- `DemoDocument` is the infrastructure wrapper for the page that the model
  writes to (`create()` / `createNull()`, `trackAppends()`).
- `KatexDemo` (AppObject) shows the model's state (preview, Send button, error
  notification, checkbox) and calls the model when the user types, toggles or
  inserts. After an insert it only does UI work: it clears the input. It
  declares the model in `watch`, so Oneput refreshes the UI on each change
  (see REFRESH_PATTERN).

If an app like this grows, the logic goes into the model. A PROVIDER does not
help, because the problem is the logic, not the number of actions.

## state and reactivity in oneput

### SUBSCRIBABLE and ONEPUT_NOTIFIER, SVELTE_STORE

- SOURCE
  - `Pull<T> = { get, subscribe? }`.
  - must have a `get`
  - if it has `subscribe` then it is a SUBSCRIBABLE
- SUBSCRIBABLE
  - is `Subscribable` interface which is the interface that defines how a reactivity system is consumed in Oneput.
  - `subscribe(onChange) => unsubscribe` (`Pull.subscribe`, `Subscribable`) as an interface
  - consumers of reactivity systems like REFRESH_PATTERN are agnostic to reactivity system used and assume `Subscribable = { subscribe }`. `watch` only listens and never reads; `onRefresh` reads through the model.
- PULL_OBJECT (see further down)
  - consumes one SOURCE: it calls get() to read the value, and if the source is also SUBSCRIBABLE, it listens on the source's subscribe; and it consumes CTL_PULL, which is also SUBSCRIBABLE (a notifier). It always listens on it.
  - it does two other things:
    - it lives on one DOM node (created in onMount and destroyed with the node),
    - and it is the only code that writes that part of the node. Those two facts are what make it a PULL_OBJECT, not just any consumer.

There's 2 reactivity systems we've used at this point:

- (1) ONEPUT_NOTIFIER
  - `notifier()` in `lib/pull.ts`; no dependency
  - manual: you call `notify()` after each change
  - does not call the listener on subscribe
  - ONEPUT_CELL
    - cell() builds on top of ONEPUT_NOTIFIER.
    - you call `cell.set()` instead of `notify`
    - It is a value plus a notifier(), and set calls notify().
- (2) SVELTE_STORE
  - `writable` / `derived` / `get` from `svelte/store`;
  - plain JS, no Svelte compiler or components
  - automatic: each `set` / `update` is the notification
  - calls the listener once, straight away, when you subscribe
  - `derived` gives derived state, declared once
  - default for app models (MODEL_NOTIFIES); e.g. `KatexFormula`
- REFRESH_PATTERN is a consumer of a reactivity system; my preference is to use SVELTE_STORE
- KatexDemo's `formula` is in `watch` (REFRESH_PATTERN), and its `subscribe` is the checkbox's Pull source (CONTROLLED_PATTERN / PULL_OBJECT).

### CTL_PULL (ctl.pull)

- is a system built on top of ONEPUT_NOTIFIER
- ctl.pull is one notifier() held by `Controller` (public pull = notifier()), with two things added on top:
  - Delivery: OneputController.svelte puts it in MountContext, so each onMount(node, ctx) gets the right instance's channel.
  - A convention:
    - a row calls ctl.pull.notify() after its own action, which the checkbox defers to a new task;
    - pull objects subscribe to it and paint again.
- designed to help you build widgets like checkboxMenuItem .
- it exists because
  - (1) A controlled input's deferred paint. This goes away without CONTROLLED_PATTERN.
    - A checkbox is controlled, so its click is cancelled. After a cancelled click, the browser puts the old tick back. That happens after our code has run, so a paint at click time gets undone. The row therefore waits a moment with setTimeout, then rings ctl.pull. The checkbox then paints, and this time the paint stays. Without CONTROLLED_PATTERN: the browser toggles the box itself and puts nothing back, so there is nothing to wait for.
  - (2) A repaint after a row's own action when the source cannot notify. This goes away if every source is SUBSCRIBABLE, for example a store.
    - An example is the BindingsEditor toggle, whose state is a plain let whenIndex. The click changes the variable, but a plain variable cannot tell anyone it changed. So the row rings ctl.pull itself, and the toggle repaints.
      - COMMENT: maybe we need to convert BindingsEditor to REFRESH_PATTERN
    - If the source can notify (a store or a cell): the source tells the toggle directly, so the row does not need to ring.
- "checkboxMenuItem is controlled (CONTROLLED_PATTERN). It paints through a PULL_OBJECT (PullCheckbox), which listens to CTL_PULL and to the source."
- PULL_OBJECT is fine-grained. It paints one DOM node with no rebuild, which matters for controls whose DOM state can disagree with the model (checked, focus, caret).
- REACTIVE_PROP (proposal only) is an alternative to PULL_OBJECT that doesn't use CTL_PULL or ONEPUT_NOTIFIER; it avoids writing a PULL_OBJECT (onMount + paint code) for each kind of control, because FChild props would follow the state by themselves.

### CONTROLLED_PATTERN / ctl.pull

COMMENT: The checkbox below is controlled, and it also uses a PULL_OBJECT (step 4) to
update the box. These are two separate ideas; see INPUT_STATE_TERMS.

A controlled input only shows state. It never changes itself, so the input and
the state cannot disagree. The state is the only truth.

To do this, call `preventDefault` on the input's click. The browser then does
not change the input. Our code writes the state, then sets the input from it.

Checkbox example (`checkboxMenuItem`). What one click on the box does:

1. The browser starts to toggle the box. `onclick` calls `preventDefault`.
2. The click goes up to the row. The row reads `source.get()` and calls
   `action(ctl, !value)`. The app writes its state.
3. The click ends. Because it was cancelled, the browser puts back the old
   value.
4. In a new task, the row calls `ctl.pull.notify()`. `PullCheckbox` sets
   `input.checked = source.get()`.

Parts:

- `checkboxMenuItem`
  - returns `MenuItem` built with `stdMenuItem` that is a row description (plain data)
  - it runs again each time menu() runs, which is on every invalidate.
  - In this case, we've created one and shared it; but the consumer could create their own using the language of oneput
- `PullCheckbox` - An object attached to the real `<input>`
  - one per DOM node, lives as long as the node does (up to a svelte destroy)
  - stores the node and the pull source - source.get
  - subscribes to source.subscribe (if present) and to ctl.pull
  - it is the only code that writes checked.
    - COMMENT: important link to CONTROLLED_PATTERN
  - created by `onMount` that `checkboxMenuItem` supplies (FChild (Svelte) calls it when the node mounts)
    - COMMENT: svelte only does this once per node even though there are multiple invalidations because the id stays the same
- `Pull`
  - pull source; it is HOW the row reads the state `({ get, subscribe? })`.
  - It is NOT the state.
  - In KatexDemo the state is `displayMode` in the model's store, and the Pull is just a window onto it.
    ```js
    checkboxMenuItem({
      ...
      source: {
        get: () => this.formula.current.displayMode,
        subscribe: this.formula.subscribe
      }
    })
    ```
- `Cell`
  - A cell is the state and its `Pull` in one object.
  - We only need it if we need something external to the checkbox that wants to update it
    - in katexdemo we might have a key binding that toggles display mode
  - A cell is not the only way to support outside writers.
    - Any Pull with subscribe works. For example, a notifier() works when the state lives elsewhere (an editor). A cell is just the easiest way when you own the state.
    - KatexDemo now uses its model's Svelte store, not a cell (see the Pull example above).
  - Create the cell once, eg as a field in an AppObject, never inside menu(). Otherwise each rebuild makes a new cell at its initial value, while the mounted PullCheckbox still reads the old one.

### PULL_OBJECT - an object on a node that reads live state

Rows keep stable ids, so a rebuild reuses the mounted node and does not run
`onMount` again. A value copied into the row at build time then goes stale. So
a row that must change without a rebuild gives its fchild an `onMount`
handler. The handler creates a small object on that node. The object reads a
`Pull<T>` source (`lib/pull.ts`), and it is the only code that writes that part
of the node.

The row is built again on each rebuild, but the object is not, so the row never
holds the object. After its own click, the row calls `ctl.pull.notify()`. Each
object subscribes to `ctl.pull` on mount and unsubscribes when its `FChild` is
destroyed. `onMount(node, ctx)` gets `ctx.pull` (a `MountContext`), which
`OneputController.svelte` provides through Svelte context. There is one per
Oneput instance, so two instances on a page do not update each other.

Rows:

- `checkboxMenuItem` — `PullCheckbox` owns the `checked` property. The box is
  also controlled (CONTROLLED_PATTERN).
- `pullToggleMenuItem` — `PullToggleValue` owns an fchild on the right that
  shows the value. The title stays the label, so the row still filters.
- `toggleMenuItem` — not a pull object. It is snapshot-based, for callers that
  rebuild after each toggle. It has the same layout.

Rules:

- Never write a text node that Svelte owns. Give the object its own fchild.
- Use `FChild` `onMount`, not the Flex mount map: Flex runs `onMount` once, on
  the parent Flex instance.
- For the source (`Pull`, `cell()`, `notifier()`), see Parts in
  CONTROLLED_PATTERN.

### REACTIVE_PROPS - a possible future UPDATE_MECHANISM

Status: Oct-2026 - an idea only. It is not built. We record it here so we can come back
to it.

The idea: an fchild takes a `Pull` directly as a prop, for example
`attr: { checked: source }` or `textContent: source`. Inside `FChild`, Svelte's
`createSubscriber` turns `get` + `subscribe` into a reactive read, and Svelte
updates only that property when the source notifies. Consumers still write
plain JS (`{ get }`, `cell()`, `notifier()`) and do not use Svelte.

What it changes, compared with PULL_OBJECT:

- Props flow on every rebuild. Svelte keeps the same `FChild` but gives it the
  new row's props, including the new source. So the problem "the node still
  holds the first build's object" does not occur.
- `PullCheckbox`, `PullToggleValue` and the pull part of `onMount(node, ctx)`
  go away.

What it does not change:

- The checkbox is still controlled and ONE_WAY. It still needs
  `preventDefault` and a deferred re-read (CONTROLLED_PATTERN). REACTIVE_PROPS
  only changes how the DOM is updated.
- A plain `{ get }` source has no `subscribe`, so something must still say
  "read again" after a click. That could still be `ctl.pull`, used inside
  `FChild`.

The main concern is which props get this treatment:

- **Prop by prop** (`checked`, then `value`, then `textContent`, ...) makes a
  list in `FChild`. Each item has its own rules: DOM property or attribute,
  who owns the text node, controlled or not. Each new kind of live row means a
  change to `FChild`.
  - COMMENT: I'm uneasy about this, as we're having to maintain a list of things
    that get treated this way and I'm wondering if it has the same generality as
    the PULL_OBJECT / "general escape hatch" approach we currently have (Oct-2026)
- **The general form** ("any `attr` value, and `textContent`, can be a `Pull`")
  removes the list. But every field then becomes "a value or a `Pull` of a
  value", and `Pull` becomes part of the description language, not a helper in
  `lib/`. In effect, everything becomes a signal. That is a large choice about
  Oneput's public model, and we must make it on purpose.

Note: a `Pull` is not a full signal. It has no automatic dependency tracking:
a source must say when it changed (`subscribe`). Svelte's `$state` tracks
reads by itself.

For now, keep PULL_OBJECT. `onMount` is a general escape hatch, and `FChild`
does not need to know about checkboxes. Look at REACTIVE_PROPS again if we
write a third or fourth pull object.

### DEC_PULL - favour pulling and invalidation vs imperative

- favour using declaring menus (AppObject.menu); these are pulled; using invalidate to re-pull (re-update)
  - we still provide the ability to imperatively set the menu using setMenu for maximum freedom
- actions have been declarative for some time

### REFRESH_PATTERN - how the UI follows the model at scale

Status: built. `AppObject.watch` and `AppObject.onRefresh` exist
(`AppController`), and a refresh rebuilds the menu with `focusBehaviour:
'none'` (idea 4). KatexDemo uses them: its model is a Svelte store
(MODEL_NOTIFIES), and `onRefresh` only shows the error notification.

The UI is a function of the model's state. Any change to the model re-derives
all of the UI. This is the part of React that holds at scale, and it does not
need dependency tracking.

Callers come from many places: actions, async tasks, outer app objects that
hold `ctl`, and UI controls like the Send button. If each caller must remember
to refresh the UI, one of them will forget. Thus the model notifies, and one
refresh runs.

#### 1. MODEL_NOTIFIES - models notify; they do not know who listens

A model has a `subscribe`, the same shape as `Pull`. It calls its listeners
after each change. It does not know about Oneput.

Default: keep the model's state in a Svelte store (`svelte/store`). A store is
plain JS: it needs no Svelte compiler and no Svelte components. Oneput already
depends on Svelte, so it adds no dependency. Each `set` or `update` is the
notification, so the model never calls `notify()` by hand, and no method can
forget to.

```ts
import { writable, derived, get } from 'svelte/store';

class KatexFormula {
  private state = writable({ source: '', displayMode: false });

  // Derived state, declared once. The UI reads it, never the raw state.
  private view = derived(this.state, ({ source, displayMode }) => {
    const c = compile(source, displayMode);
    return { source, displayMode, preview: ..., error: ..., canInsert: ... };
  });

  subscribe = (onChange: () => void) => this.view.subscribe(() => onChange());
  get current() { return get(this.view); }

  // Writes go through methods, so the model keeps its rules.
  setSource(source: string) { this.state.update((s) => ({ ...s, source })); }
  toggleDisplayMode() { this.state.update((s) => ({ ...s, displayMode: !s.displayMode })); }
  insert() { if (!this.current.canInsert) return false; ...; this.setSource(''); return true; }
}
```

Keep the store private. Callers change state only through the model's methods,
and read it through `current`.

Not the default: a hand-written `notifier()` with a `notify()` call at the end
of each method. It works, because `watch` only needs `subscribe`, but each new
method must remember to notify. Another library (valtio, signals) also works
through a one-line `subscribe` adapter.

Actions, async code and outer objects only change the model. They do not
refresh the UI.

```ts
actions = {
  [OneputAction.SUBMIT]: { action: () => this.formula.insert() },
  TOGGLE_DISPLAY_MODE: { action: () => this.formula.toggleDisplayMode() }
};
```

#### 2. ONE_REFRESH - the AppObject has one refresh, and it is idempotent

A refresh derives all of the UI from state. It never asks what changed.
Running it twice gives the same UI as running it once.

Oneput already knows how to re-pull the declarative parts, `menu()` and
`actions()`, so it does that itself. The AppObject gives an optional
`onRefresh` hook for the imperative parts that Oneput cannot know about:
input chrome, notifications, the placeholder.

```ts
// Oneput, on a refresh:
app.onRefresh?.();
ctl.menu.invalidate();
if (typeof app.actions === 'function') ctl.app.invalidateActions();

// KatexDemo
onRefresh = () => {
  ctl.ui.invalidate(); // reads the layout again; inputSend.enabled calls formula.canInsert()
  if (formula.error) ctl.notify('Invalid katex: ' + formula.error);
  else ctl.clearNotifications();
};
```

An AppObject with no imperative parts needs no `onRefresh`.

`onRefresh` only reads the model. If it changes the model, the model notifies
again and the refresh loops.

The signal is blunt: it says "something changed", and nothing more. This is
on purpose. If the refresh cannot branch on what changed, it cannot get out of
step with the state. If each event updates its own part of the UI, N events
and M UI parts give N × M paths. With one refresh, there is one path.

A notification can carry data (for example a DOM `CustomEvent` with
`detail`). If Oneput passes it to `onRefresh`, it is a hint for speed only.
The UI must still be correct when the hint is ignored. Meaning goes in
DOMAIN_EVENTS.

#### 3. FRAMEWORK_WATCH - the framework wires the subscriptions

The AppObject declares the models it shows in `watch`: a list of things that
have a `subscribe` method. Oneput does the subscriptions, in the same way as
for the declarative `events` handlers.

```ts
class KatexDemo implements AppObject {
  watch = () => [this.formula];
  onRefresh = () => { ... }; // see ONE_REFRESH
}
```

`watch` is a function, like `menu`. Class field initializers run before the
constructor body, so a plain array (`watch = [this.formula]`) could hold
`[undefined]` when `formula` is a constructor parameter property. A function
runs later, when Oneput calls it.

Lifecycle:

- Start and resume: after `onStart` / `onResume`, Oneput calls `subscribe` on
  each item in `watch`, and keeps the unsubscribe functions. It then refreshes
  once, because the model can change while the AppObject is not current.
- Suspend (a child AppObject runs on top) and exit: Oneput unsubscribes all.
  Thus an AppObject that is not current does not repaint.

When a model notifies, its listeners run at once, in the same call. Oneput's
listener does not refresh at once. It schedules one refresh, and more
notifies before that refresh do not add more. Thus a model can notify freely:
`insert()` that also calls `setSource('')` gives one refresh, not two.

No AppObject writes subscribe and unsubscribe code by hand, so none can leak.
For many models, add each one to `watch`. They share one refresh.

Limit: Oneput reads `watch` when it subscribes. If the AppObject replaces a
model later (for example, it opens a different document), the new model is
not watched. Because `watch` is a function, a possible fix is a call that
makes Oneput call it again and subscribe again, like `ctl.app.invalidate()`
for `actions`.

#### 4. INTENT_IS_NOT_STATE - transient intent does not go through refresh

Some things are an intent for one moment, not state. Focus is the main
example: KatexDemo used to pass `focusBehaviour: 'none'` only for the display
mode toggle, so that it did not move the focus. A refresh cannot know this,
because it does not ask what changed.

Fix the default, not the refresh: a refresh rebuild keeps the focus where it
is. Only a new menu (`setMenu`, a new AppObject) moves it. Then the refresh
needs no arguments. Oneput's refresh now always rebuilds the menu with
`focusBehaviour: 'none'`.

If an action really needs a one-time intent, the action states it to Oneput
directly. It does not pass it through the model.

#### 5. DOMAIN_EVENTS - domain events are for meaning, not repaint

Events that say what happened go in `AppEventMap` and `ctl.appEvents`. Other
listeners use them: save, log, analytics, an outer app object.

```ts
interface AppEventMap {
  'katex:inserted': { html: string };
}
```

The UI never depends on these events to repaint. The model notification
(MODEL_NOTIFIES) already does that.

#### How the cases resolve

- Typing: `onInputChange` calls `formula.setSource`, then the model notifies
  and the UI refreshes.
- The submit key and the Send button: both run the SUBMIT action, then the
  model changes, notifies and the UI refreshes.
- Async: when the work finishes, it changes the model, which notifies. Nothing
  extra is needed.
- Outer app objects with `ctl`: they change the model. They do not call the
  AppObject.

Risk: a model that changes very often refreshes very often. `invalidate`
coalescing handles the menu. Batching is the framework's job, not the app's.

## MenuLike (menu and menu-like contract)

Working name: **MenuLike** (rename later if a better term lands).

`setMenu` / `menu()` govern the **list** menu. More generally, anything that
owns the menu area should honour this MenuLike contract:

- a focus that can be moved (calendar: up/down and left/right; list: next/prev)
- ability to filter/search, or turn it off
- an action that fires on the focused thing (may load a new menu / AppObject)
- identity
  - item id + last-action tracking (where it applies)
- filter / generative
  - chat: often generative
  - calendar: often neither
  - traditional list: either
  - katex demo: generative used for preview

`replaceMenuUI` is **not** MenuLike — it only swaps pixels (alerts /
confirmations). Using it for calendar/chat means rebuilding focus, filter, and
activate yourself.

## Composition and ownership

SUMMARY: we start with who "owns" what. We have the host application which authors/owns its own AppObject's and layout. It might create its own reusable components like RICH_MENU_ITEM's or reusable AppObject's (using `SharedCtl`). By contrast a 3rd party is by definition reusable but can't assume too much about the layout of the host application; it sticks with RICH_MENU_ITEM's and shared AppObjects (`SharedCtl`) or provides 3rd party chrome that the consumer can add to its ui layout. The menu area is the most prominent feature of Oneput's ui, the focal point. The current menu gets to own the most significant real estate including a fixed header and footer and the content in between. The current menu is owned by the current active AppObject. They operate within the Oneput application which owns the overall UI and layout. Shared AppObjects own less than host AppObjects; they take `SharedCtl` and have more restricted access to layout chrome.

- The Oneput application owns the layout, overall UI and any normal AppObject's usually including the initial aka root AppObject.
- AppObject's own the menus that are shown during their lifetimes.
- The current menu (created by `setMenu` usually via declarative `AppObject.menu`) owns the menuUI excluding the "layout" menu ui.

To create and compose reusable "components" including 3rd party components we have several strategies:

- 3rd party providers can call signals (which the hosting ui should handle eg `inputAccept`, `inputSend`, etc.) and set flags (`enableGoBack` etc) and use AppObject lifecycle (imperatively or declaratively: onMenuOpenClose, onBack etc). These don't give much control over the ui but they do handle very common situations.
- create a RICH_MENU_ITEM
  - for bespoke ui that you want to show in the menu area which acts as the central display area of oneput
  - eg a calendar
  - it might be that the host application builds its own AppObject or even a shared AppObject (`SharedCtl`) around a 3rd party RICH_MENU_ITEM giving it the most freedom to do things
  - 3rd party providers should provide RICH_MENU_ITEM's, shared AppObjects, and any business logic formatting functions as 3 separate things maximising consumer options
- create a shared AppObject (`SharedCtl` in `create` / ctor)
  - particularly useful for 3rd party but may also be good for internally reusable AppObject's
  - limited access to layout to avoid creating chaos; instead can send signal to the host UI like "inputAccept" etc
  - may incorporate RICH_MENU_ITEM's to achieve a desired result
- create an AppObject
  - AppObject's are created for the Oneput application; they have full access to the UI/layout because it is also owned by the Oneput application
- 3rd party chrome
  - examples are the "menu item count" widget, or a widget that shows the time
  - the host application
- TODO
  - what we haven't covered is a 3rd party shared AppObject that might want to set or influence 3rd party chrome when its active

## ONEPUT_FILE_LAYOUT

An application can wire the same behavior into more than one UI system. Keep
each UI system in its own surface directory under `ui/`. For example, Frame
chrome and Oneput AppObjects are separate wiring systems even when they use the
same application actions.

```text
ui/
  frame/
    Chrome.ts
    icons.ts
  oneput/
    init.ts
    ActionProvider.ts
    icons.ts
    apps/
      ChromeStatusApp.ts
```

Use `ui/oneput/apps/` for all AppObjects, including applications that currently
have only one AppObject. This gives every Oneput integration one stable place
to grow.

- Use a named file such as `ChromeStatusApp.ts` while an AppObject has no
  private support files.
- When an AppObject grows, move it into a named directory and use `App.ts` as
  its entry point:

  ```text
  ui/oneput/apps/
    RootApp.ts
    node-metadata/
      App.ts
      Fields.ts
      App.test.ts
  ```

- Put files shared by several AppObjects in `ui/oneput/shared/`. Do not create
  `shared/` for code that has only one owner.
- Put surface-wide Oneput wiring, such as initialization, action providers, layouts,
  and icon registration, beside `apps/` in `ui/oneput/`.
- Put AppObject-private wiring inside that AppObject's directory.
- Do not use `ui/lib/` for top-level wiring. Reserve `lib/` for reusable,
  lower-level implementation primitives.
- Do not use filename underscores for support files after the directory gives
  them a clear namespace. Prefer `ui/oneput/ActionProvider.ts` to `_actionProvider.ts`.

Keep application behavior outside the UI surface directories. Inject the same
behavior objects into each surface adapter that needs them. For example,
`ui/frame/Chrome.ts` and a Oneput AppObject can both receive `Actions`; Frame
chrome must not depend on a Oneput action provider only to reach those actions.

## Layout params vs direct UI (`inputSend`, `inputAccept`, `inputReject`)

Shared AppObjects should not assume where host chrome lives. They advertise
chrome roles with layout params (not lifecycle):

- `inputAccept` — accept the current choice (e.g. Done on SetDate; confirm key capture). Exit stays in the AppObject’s `run` when needed.
- `inputSend` — send / submit a message (e.g. Eliza chat)
- `inputReject` — dismiss (e.g. abort key capture in BindingsEditor)
- exit without a result — not a layout param
  - AppObject calls bare `ctl.app.exit()` (no payload)
  - typically from `onBack` / goBack, or `onMenuOpenChange` when the menu closes
  - opt in with flags `enableGoBack` and `enableMenuOpenClose`
  - host layout surfaces ← and X from those flags
  - when the menu is closing, `exit` / `closeAndExit` wait for the close outro before pop; when the menu is already closed, pop is immediate

The host layout decides how to surface these — commonly on `inputUI.right`, even
when the input field itself is disabled. Shared button chrome lives in
`shared/ui/buttons.ts` (`acceptButton`, `sendButton`, `rejectButton`).
A reusable host shell is `shared/ui/layout/StandardLayout.ts` — close over host
icons in the install factory (`(ctl, params) => StandardLayout.create(...)`).

`SharedCtl` (type-only allowlist) is what reusable / 3rd-party AppObjects take in
`create` / the constructor — hosts still pass the real `Controller`; the
constructor is typed narrower so it cannot call layout-direct APIs like
`setInputUI`.

Host-owned AppObjects retain full `setInputUI`. If the layout also maps these
signals onto `inputUI.right`, those can clash (`ui.update` replaces `inputUI`
from the layout; `setInputUI` patches it). That is an acceptable first-party
footgun:

> Host layouts may surface `inputAccept` / `inputSend` / `inputReject` (e.g. on
> `inputUI.right`). If your own AppObjects also call `setInputUI`, those can
> clash — coordinate them. Shared AppObjects use `SharedCtl` and cannot set
> input UI, so they don’t have this risk.

“Coordinate” can mean composing in the layout (e.g. adornments from the
AppObject plus Accept from `inputAccept` in one `right` flex), not only
“use one or the other.”

## RICH_MENU_ITEM's

- examples
  - set date
  - set time

## ENTER_SEMANTICS - enter key semantics

Recall we have `DO_ACTION` which triggers a menu action for the currently focused menu item; and we have `SUBMIT` action which submits the input. It's common for both of these to be the `Enter` key. The AppObject author (consumer) can of course use a different key.

Factors (ENTER_SEMANTICS_FACTORS)

- tabbing from browser native input focus to a button focus (eg a submit/send button or even the menu open/close button etc) and hitting `Enter` should trigger that button using native browser functionality
- similarly for `Space` should also trigger the button under focus using native browser functionality
- a focused menu item (using oneput synthetic menu item focus) implies `DO_ACTION` should trigger; it's common to bind `Enter` to `DO_ACTION`; so we want to allow for this binding
- sometimes we need `Enter` even when natively focused on a button - eg key capture in a bindings editor that has to intercept everything
- the consumer may want `Enter` to generate a newline when the input is a textarea
- there is no value in `Enter` generating a newline when the input is a single line; `Enter` is more free for use elsewhere in this scenario; this is also often the more common scenario; switching to a multiline input suggests the user has been put into a temporary dedicated authoring mode in order to write something more substantial.
- mobile users don't care about `Tab` or `Enter` as ux is driven by touch and soft-keyboard
- `$mod+Enter` might be a common binding choice for `SUBMIT`

Example: see KatexDemo. Here we have a multiline input where we type latex; we have a checkbox-based menu item that toggles display mode. We have a submit button. KatexDemo uses INPUT_ROW (below).

We have 3 settings that we can vary to achieve a satisfactory outcome based on these factors.

- (1) `rows` in `setInputUI`
  - just sets if we're multiline or not; if multiline the consumer then needs to decide what ENTER_SEMANTICS they want
  - `InputController.isMultiline` detects multiline textarea; single line textarea counts as a multiline because native `Enter` will still generate a newline
- (2) `enableMenuItemFocus` (default true)
  - if `false` removes menu item focus and related actions that change it, gates the `DO_ACTION` binding associated with this focus but does not disable the menu item action itself; it signals to the user that keyboard menu selection/activation semantics are no longer present but that doesn't prevent them from activating the present menu items by other means: dedicated key binding, touch/click, native tab focus
  - by contrast: `enableMenuActions` disables the action but does not change the appearance or disable menu item focus; it's used to temporarily freeze interactivity; the 2 could be combined along with styling to disable the menu (TODO: we might set a disable flag on the input so CSS styling can reflect the change)
- (3) `enableNativeActivation` (default true)
  - if native browser focus is on a button, this will take precedence over any declared oneput binding for `Enter` and `Space`; (a modifier on `Enter` or `Space` or any key is considered a different binding)

COMMENT: dead combination: `enableMenuItemFocus: false` + `enableNativeActivation: false` leaves `Enter` doing nothing anywhere except a newline in a textarea.

### INPUT_ROW (pattern)

INPUT_ROW keeps menu item focus on and still gives `Enter` to a textarea. Use it when a menu has a few controls next to a multiline input.

- One row stands for the input (in KatexDemo, the preview). It is focusable (not `ignored`) and has no `action`.
- When that row has focus, `DO_ACTION` finds no action and returns false. Thus `Enter` falls through and the textarea writes a newline.
- When a control row has focus, `Enter` runs `DO_ACTION` on it as usual.

Three rules keep native focus and menu focus in step:

1. Keyboard focus on the input row focuses the input.
2. Keyboard focus on a control row blurs the input.
3. When the input gets focus, menu focus moves to the input row.

```ts
// rules 1 and 2: one AppObject hook, thus no code on each row
onMenuItemFocus = ({ menuItem, cause }) => {
  if (cause !== 'keyboard') return;
  if (menuItem?.id === INPUT_ROW_ID) ctl.input.focus();
  else ctl.input.blur();
};
// rule 3: in onStart (unsubscribe in onExit)
ctl.input.subscribeFocusChange((focused) => {
  if (focused) ctl.menu.focusMenuItemById(INPUT_ROW_ID);
});
```

Rules 1 and 2 respond only to `keyboard`. Pointer hover and invalidate also move menu focus, and they must not take focus away from the input while the user types. Rule 3 moves focus with cause `programmatic`, which `onMenuItemFocus` ignores, thus the rules do not loop. Every row other than the input row blurs the input, thus a new row needs no extra code.

Compare setting (2): `enableMenuItemFocus: false` also frees `Enter`, but it removes keyboard menu selection completely.

### LIVE_EDIT (pattern)

`LIVE_EDIT` lets the shared Oneput input edit the value represented by a menu
row. The row is the selected edit target; it does not become a native form
field. The menu must have one clear owner for the input at a time.

LIVE_EDIT is the first example of INPUT_CLAIM usage.

Input ownership is a first-class **input claim** (`InputScope.claim`). An active
claim routes typed text to `claim.write`. Raw `input-change` still broadcasts
for diagnostics and history; only the semantic route is exclusive. Closing the
AppObject's `InputScope` (suspend / exit) releases any remaining claim.

There are two patterns.

#### GATED_LIVE_EDIT aka Mixed-menu editing

COMMENT: "gated" means you have to activate the menu item to do the LIVE_EDIT; "mixed" means you might have a normal menu that you can filter on but you want to add a LIVE_EDIT item to it; this is where we have to be careful because the menu may want to filter and that can cause issues if LIVE_EDIT is activated on focus (ungated) rather than menu item activation...

Use this when typing normally filters a menu that contains some editable rows.
Focusing an editable row is not enough to edit it. The user must activate the
row to transfer input ownership.

Prefer `MenuLiveEdit` (`shared/behaviors/liveEdit/MenuLiveEdit.ts`). Opted-in
rows from `liveEdit.item()` / `bind()` / `field()` claim the shared input with
a release policy (Back, focus leave, owner removed, AppObject exit).

- Activate acquires an input claim (suspends filter / generative).
- Activate again, move menu focus, or back releases the claim.
- Default `resumePrevious: 'restore'` puts the previous filter query back.

```text
filtering
  └─ activate editable row → claim (editing)
       ├─ activate again → release → filtering
       ├─ move menu focus → release → filtering
       └─ back → release → filtering (back does not exit)
```

Set `clearInputAfterAction: false` so activate does not clear the claimed value.

For multiline input, validation, or commit/cancel workflows, launch a dedicated
editor AppObject instead of adding more modes to the current AppObject.

#### FOCUSED_LIVE_EDIT (ungated)

A row claims the input when it receives menu focus. It does not claim during
`menu()` construction, and it does not need an action.

Use this only when filtering is off and most or all focusable rows are editable:

```typescript
settings = { enableFilter: false };
```

Prefer `FocusedMenuLiveEdit` (`shared/behaviors/liveEdit/FocusedMenuLiveEdit.ts`).
Rows from `liveEdit.item()` / `bind()` attach `MenuItem.onFocus`, which claims
the shared input. Moving focus hands over: previous claim releases, then the
new row claims. Claiming the same row again is idempotent (safe under
invalidate).

Claim-on-focus in a filtered mixed menu is hazardous:

- Opening the menu can focus an editable row and immediately replace the filter input.
- Filtering can move focus onto an editable row while the user is typing.
- Pointer hover can unexpectedly start editing.
- An invalidation can appear to re-enter editing.

For mixed filtered menus, prefer `MenuLiveEdit` (claim on activate).

If you need claim-on-focus in a mixed menu anyway, filter by
`MenuItemFocusCause` and accept only deliberate keyboard navigation:

```typescript
onFocus: (_ctl, { cause }) => {
  if (cause === 'keyboard') {
    this.claim(id, binding);
  }
};
```

Do not claim on `open`, `filter`, or `invalidate` in that case. Pointer
activation can still use the action path.

`FocusedMenuLiveEditExample` in `oneput-demo` is the minimal whole-menu example.
`AddEntry` in TomatoTimer is a larger example of the same idea.

## SUBMIT_PATTERN and `[OneputAction.SUBMIT]`

Oneput has a built-in submit action with a default key, ⌘Enter. On the default path, you keep that built-in action and just tell it what to do with setSubmitHandler. TODO: we could make this declarative by providing a onSubmit handler to `AppObject`.

On the other path, you declare your own action with the same id, `[OneputAction.SUBMIT]`, in AppObject.actions. The same ⌘Enter key then runs your action, and the built-in is skipped.
Not specifying the binding means "use whatever key submit already has". If we specify a binding against `[OneputAction.SUBMIT]` is equivalent to "in this AppObject, submit is now this key" (when we exit the AppObject the submit binding comes back).

## MENU_LIFECYCLE

Menu callbacks observe a fully resolved menu snapshot. When a closed menu opens,
Oneput rebuilds its rows, resolves synthetic focus, and applies that state before
it calls any AppObject menu callback.

Callbacks then run in this order:

1. `onMenuOpenChange({ open: true })`
2. `onMenuUpdate({ cause, menuId, menuItem, index })`
3. `onMenuItemFocus({ menuId, menuItem, index })` when focus was resolved or changed

`onMenuUpdate` also runs after `setMenu()` and filtered redisplays while the menu
is open. Use it when code must react to a replaced item even if the focused
index stays the same. `onMenuItemFocus` is for focus changes only.

`onMenuUpdate` does not run when `setMenu()` only stores rows for a closed menu.
It runs when those rows become the displayed snapshot during open.

`cause` identifies the outer operation that produced the snapshot:

- `set-menu` — `setMenu()` replaced the displayed menu
- `invalidate` — `invalidate()` rebuilt or redisplayed the menu
- `input-change` — an input event redisplayed the menu
- `open` — opening refreshed a previously closed menu

## Nested menus

Oneput has no menu stack. One AppObject can show several menu levels (a list, then one item, then a detail). The AppObject changes the menu itself and tells Oneput what Back does (see BACK_HANDLING). There are two patterns.

### IMPERATIVE_NESTING - `setMenu` + `setOnBack`

Each level is a method. It sets the title, the Back handler and the menu. Back calls the method of the parent level. Example: `BindingsEditor` (actions list → one action → capture keys → "when" flag).

```ts
private listUI = () => {
  this.ctl.ui.update({ params: { menuTitle: 'Items' } });
  this.ctl.app.setOnBack(() => this.ctl.app.exit()); // top level: leave the AppObject
  this.ctl.menu.setMenu({ id: 'list', items: items.map((i) => row(i, () => this.itemUI(i))) });
};

private itemUI = (item: Item) => {
  this.ctl.ui.update({ params: { menuTitle: item.name } });
  this.ctl.app.setOnBack(() => this.listUI()); // Back goes to the parent level
  this.ctl.menu.setMenu({ id: `item-${item.id}`, items: [...] });
};
```

- Good for a flow of steps, where each step does some setup (key capture, input placeholder, modal flags).
- Each level must set everything it needs, because the previous level's title, params and Back handler stay until something replaces them.

### DECLARATIVE_NESTING - level state + `menu()` + `onBack`

The current level is state. `menu()` (and `layout.params`, if it is a function of state) build from that state. The declarative `onBack` moves the state up one level. Fits REFRESH_PATTERN: when the level is in the model, `watch` refreshes the UI, and nothing calls `invalidate`.

```ts
level: { kind: 'list' } | { kind: 'item'; item: Item } = { kind: 'list' };

menu = () =>
  this.level.kind === 'list'
    ? { id: 'list', items: items.map((i) => row(i, () => this.open(i))) }
    : { id: `item-${this.level.item.id}`, items: [...] };

onBack = () => {
  if (this.level.kind === 'list') return this.ctl.app.exit();
  this.level = { kind: 'list' };
  this.ctl.menu.invalidate(); // or: write to the model, and `watch` refreshes
};
```

- Good when levels are views of the same data, with no per-level setup.
- The UI is always a function of the level, thus no level leaves stale state behind.

### BACK_HANDLING - who handles Back, and when Back is available

`ctl.app.goBack()` uses the first of these that applies: an active input claim, `enableGoBack: false` (stop), the `setOnBack` handler, the AppObject's `onBack`, then pop to the parent AppObject (or the root-exit handler). Thus a nested level gets Back before the AppObject stack does. Oneput clears `setOnBack` each time an AppObject starts or resumes (an exit resumes the parent), thus a handler does not leak into another AppObject.

`setOnBack` and `onBack` mean the same thing to `ctl.app`: the AppObject handles Back itself. Thus the AppObject also decides when to `exit()`. At its top level, the handler must exit (or do something else useful), or Back does nothing there.

`ctl.app.canGoBack()` answers "does Back have somewhere to go?". The Back menu rows (`OneputActionProvider` BACK, jsed's back row) use it to show or hide themselves. Oneput knows the AppObject stack, but it cannot know what a Back handler does. Thus a handler does not count by itself, and the AppObject reports its own levels with `hasBackLevel`:

| Case                                                          | `canGoBack()`                              |
| ------------------------------------------------------------- | ------------------------------------------ |
| a parent AppObject, or a root-exit handler                    | true (`exit()` always has somewhere to go) |
| a root AppObject with no Back handler                         | false                                      |
| a root AppObject that handles Back, with no root-exit handler | `hasBackLevel?.() === true`                |
| `enableGoBack: false`                                         | false                                      |

COMMENT: `hasBackLevel` only matters in one case: a root AppObject, with no root-exit handler, that handles Back itself (setOnBack or onBack).

```ts
// FilePicker: a parent folder is a level
hasBackLevel = () => this.path !== '/';
onBack = () => (this.path === '/' ? this.ctl.app.exit() : this.navigateTo(this.parentPath()));
```

The AppObject keeps `hasBackLevel` correct for its own levels. It never needs to know whether it has a parent, because `ctl.app` adds that part. When `hasBackLevel` is omitted, a root AppObject with levels hides the Back rows, but Back still works.

COMMENT: the layout's Back button (StandardLayout) shows when `enableGoBack` is on and does not read `canGoBack()`. Thus the button and the Back row can disagree.

All levels share one set of `actions`, bindings, `settings` and lifecycle hooks. When a level needs its own keys, flags or cleanup, use a child AppObject (`ctl.app.run`) instead.

## INPUT_CLAIM's

A claim is useful when an existing `AppObject` temporarily changes what typing means.

An input claim makes input ownership a first-class controller concept. It separates two questions:

1. Who currently owns typed text?
2. What causes that ownership to change?

Today, ownership is implicit. `input-change` is broadcast. The menu filter, generative menu, and current `AppObject` can all react. `MixedLiveEdit` must disable one listener path, update UI flags, replace the input value, and restore everything later.

With claims, input events have one semantic destination:

```text
No claim
  → current AppObject input policy
  → filter, generative menu, or ordinary onInputChange

Active claim
  → claim.onChange
```

Raw input events can still be broadcast for diagnostics and input history. Only the semantic input route becomes exclusive.

While the lease exists:

- Input changes go to the lease.
- Filtering is suspended.
- Back releases the lease.
- A focus change releases the lease.
- The owning row can show its editing state.

When released, the input returns to its previous owner: the menu filter.

### Other input-claim cases

#### Search within the current screen

Suppose typing normally filters the action menu. The user activates “Find in document”.

```text
menu filtering
  → Find claims input
  → typing updates document matches
  → Back releases Find
  → previous menu query returns
```

The search owner supplies:

```typescript
value: {
  read: () => searchQuery,
  write: (value) => {
    searchQuery = value;
    highlightMatches(value);
  }
}
```

A dedicated search `AppObject` does not need a claim. The claim is useful when search is a temporary mode inside the current screen.

#### Command or action arguments

The user selects “Move to workspace…”. The input changes from menu filtering to destination entry:

```text
menu filtering
  → Move claims input
  → typing derives destination candidates
  → Enter performs the move
  → Back cancels
```

This needs more than the current claim API because it needs submit handling. A later claim contract could include `onSubmit`.

#### Inline date, number, or tag entry

A row can claim the input for an immediate draft:

```text
Date: 29 August 2026
  → activate
  → type “next Friday”
  → preview parsed value
  → leave row
```

The current claim supports simple live writes. It does not yet support validation, commit, and rollback. A transactional date editor should still use a child `AppObject`, unless claims gain explicit draft, submit, and cancel semantics.

#### Rename, label, URL, and metadata fields

This is the present LIVE_EDIT case. The input writes directly to one field while its claim exists.

Therefore, my earlier wording was too broad: claims can support these modes, but the current API fully supports only exclusive live input and restoration. Search is close. Command arguments and transactional date entry need additional lifecycle events.

## Styling

### CUSTOM_ROW_FOCUS

Oneput shows menu focus with a class. The class is the row's `class` plus `--focused`. A row with no `class` gets `oneput__menu-item--focused`, and the default CSS styles that only on a `button`.

A custom row, such as an INPUT_ROW that is a `div`, sets its own `class` and styles its own focus:

```ts
menuItem({ id: 'katex-preview-pane', type: 'vflex', class: 'katex-preview-pane', ... })
```

```css
.katex-preview-pane--focused {
  outline: 2px dashed color-mix(in srgb, currentColor 40%, transparent);
}
```

A custom `class` replaces `oneput__menu-item`, thus the row also loses the default row background.

## Appendix - INPUT_STATE_TERMS - three separate questions

COMMENT: this came from a discussion with opus 5.5 on CONTROLLED_PATTERN vs REACTIVE_PROPS after tidying how checkboxMenuItem was being used in KatexDemo (Oct-2026).

Three terms are easy to mix up. Each one answers a different question. Oneput
makes one choice for each.

### 1. Controlled vs uncontrolled: who owns the value?

- **Controlled**: the app state owns the value. The input only shows it. See
  CONTROLLED_PATTERN.
- **Uncontrolled**: the DOM owns the value. The app reads it when it needs it,
  for example on submit.

Oneput: **controlled** (`checkboxMenuItem`).

### 2. ONE_WAY One-way vs TWO_WAY two-way: does the input write back to the state by itself?

- **One-way**: data goes from state to input only. A user change comes back as
  an event, and the app decides what to write. In Oneput that event is the
  row's `action`.
- **Two-way**: the browser changes the input, and a binding writes the new value
  back to the state automatically, such as Svelte's `bind:checked` or Vue's
  `v-model`. The source must be writable (`get` / `set` / `subscribe`, as in a
  `Cell`). It needs no `preventDefault` and no deferred paint. But if the app
  refuses a write, it must set the input back from the state, because the
  browser has already changed it. Svelte's `bind:` with a setter that refuses
  has this problem.

Oneput: **one-way**. Controlled is always one-way. Two-way is close to
uncontrolled, with a write-back step added.

### 3. UPDATE_MECHANISM: how does the DOM follow the state?

This is the question that the other two terms do not cover.

- **REBUILD**: call `invalidate`. `menu()` runs again, and Svelte compares the
  new rows by id. Use this for the shape of the menu: which rows exist,
  preview content, filter results. See DEC_PULL.
- **PULL_OBJECT**: an `onMount` handler creates a small object on one node,
  such as `PullCheckbox`. The object subscribes to the source and to
  `ctl.pull`, and it sets the DOM property itself. Use this for one value that
  must change without a rebuild. This is what Oneput uses now. See
  PULL_OBJECT.
- **REACTIVE_PROPS**: not built. See REACTIVE_PROPS.

Questions 1 and 2 are about who may change the value. Question 3 is about how
the screen catches up. You can combine any answer to 3 with any answer to 1 or 2.

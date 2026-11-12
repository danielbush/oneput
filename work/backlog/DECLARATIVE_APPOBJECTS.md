# DECLARATIVE_APPOBJECTS

Make the common AppObject glue a stored, validated data document that one generic AppObject can interpret. This lets a human or agent describe menus and the small parts around the input and menu header, while models, state machines, and Effect services keep the business rules. The chrome builders already return object trees. Named events, live source bindings, and checked parts in named slots can make their inputs storable data. Layout factories, CSS, and the current tree renderer stay code.

## 1. Scope and recommendation

Use two connected documents: a view definition and, when needed, a flow definition. The view says what to show and which named event an action sends. The flow says what happens next. Neither document contains JavaScript functions.

First build a separate declarative demo beside the main and routed demos. Prove live lists, input events, a stack picker result, promise load states, signals, and a typed Effect failure in that demo. These are the first design test, not later extensions. Use named sources for all computed values. Do not make an expression language for menus.

Recommend a small built-in description validator that returns neverthrow Results. Keep Effect in host adapters. Allow Standard Schema at the host contract boundary when needed. Render through SAFE_HTML; do not make a second HTML or icon policy.

This is a design report, not an implementation. All proposed types and functions below are new. Paths without a repo prefix are in `/Users/danb/projects/@oneput-declarative`; paths starting with `@2br/` are under `/Users/danb/projects/@2br`. `SAFE_HTML/` means `/Users/danb/projects/@oneput-safe-html`, branch `sec/safe-html`. Citations refer to the files read for this report on 12 November 2026. Another worker can change those files and their line numbers.

The original request is at `work/backlog/oneput.md:223`. DECLARATIVE_ONEPUT concerns state machines *inside* Oneput (`work/backlog/oneput.md:226`). It is separate work. This proposal can use the current controllers. The deep module direction at `work/backlog/oneput.md:234` supports a small public definition and interpreter, with rendering and validation details below them.

## 2. What an AppObject is today

An AppObject is a screen or state in the app stack. It is an interface, not a required base class. Most consumers use a class that implements it (`packages/oneput/src/lib/oneput/types.ts:649`). Its declaration is partly data and partly executable functions.

| Part | Current contract and owner |
| --- | --- |
| Lifecycle | `onStart`, `onSuspend`, `onResume`, and `onExit`. A child returns a payload to its parent through `onResume`. |
| Menu | `menu()` returns a `Menu`, or a hook calls `setMenu`. Rows have stable IDs, focus rules, optional pinned header/footer, and action callbacks. |
| Actions | `actions` is a map or a function that returns a map. Each entry has a callback and an optional binding. |
| Bindings | Key strings, description, `when`, and `preventDefault`. The current `WhenCondition` type has only `menuOpen`. |
| Layout | Install a layout factory, or set params on the inherited layout. Params include title, input kind, and Accept/Reject/Send affordances. Those affordances still contain functions. |
| Settings | Boolean flags control filtering, keys, menu actions, focus, input clearing, modal mode, and other controller behaviour. |
| Input | `onInputChange`, submit handlers, filters, generators, and temporary input claims have separate roles. |
| Back | `onBack` can handle local levels. `hasBackLevel` reports that such a level exists. The controller owns stack navigation. |
| Refresh and events | `watch()` gives change sources. Oneput refreshes layout, menu, and derived actions. `events` handles host events only while this AppObject is current. |

Sources: `packages/oneput/src/lib/oneput/types.ts:660`, `:669`, `:708`, `:770`, `:791`, `:810`, `:826`; `packages/oneput/src/lib/oneput/lib/bindings.ts:50`; `packages/oneput/src/lib/oneput/types.ts:569`.

`Controller` composes the app, menu, input, key, and UI controllers (`packages/oneput/src/lib/oneput/controllers/controller.ts:15`). The app controller restores declarations on resume and owns `watch` subscriptions (`packages/oneput/src/lib/oneput/controllers/AppController.ts:605`, `:631`). The interpreter should use these contracts.

### Three concrete examples

**Welcome and Form: almost all glue.** `Welcome` sets a title, disables Back, builds one row, and sends the machine an event. No business rule is in this class (`apps/oneput-demo/src/lib/routed/Welcome.ts:16`). `Form` also opens a colour picker on the stack, then sends events to continue or return (`apps/oneput-demo/src/lib/routed/Form.ts:21`). The machine owns those transitions (`apps/oneput-demo/src/lib/routed/flowMachine.ts:27`). The source uses uppercase event names. The new demo follows that convention with its own events.

**Themes: display glue mixed with an asynchronous command.** `ThemesUI` maps names to rows and shows a tick for the active theme. This is display glue. `select` asks config to set the theme, closes on success, and reports an error on failure. The command belongs behind the config boundary; the success/error flow belongs in an action handler or machine. The definition can name that command and show its state. It must not store the Promise or callback (`@2br/packages/oneput/src/ThemesUI.ts:68`, `:75`, `:82`, `:94`).

**Providers and its key form: glue plus meaningful state.** `ProvidersUI` maps the providers graph to names, icons, status text, and child forms. This is glue. `ProviderUI` holds an unsaved key, decides if Save is available, saves through config, and clears the draft after success. The draft and save policy need a model; password claims need a reusable input behaviour. A data document can select these things, but should not implement them (`@2br/packages/oneput/src/ProvidersUI.ts:28`, `:75`, `:98`, `:119`). The current boundary lets the page save a key but never read the saved key (`@2br/packages/oneput/src/configAccess.ts:7`). Preserve that boundary.

Other useful cases show the limits:

- `Settings` wires a checkbox and two child factories. Choosing a test store is construction logic, not menu data (`apps/oneput-demo/src/lib/main/Settings.ts:12`, `:52`).
- `AgentsUI` sorts the default agent first, chooses a provider, and refuses to open a form without one. Put that rule in a model or machine; bind the result into rows (`@2br/packages/oneput/src/AgentsUI.ts:50`).
- Chat already collates labels, icons, and keys, but still stores icon builders and callbacks. Sending, retrying, and deleting are domain commands; input focus and child menu wiring are glue (`@2br/packages/oneput/src/ChatUI.ts:75`, `:169`, `:192`, `:240`).
- `DocumentApp` bridges editor signals, action providers, lifecycle, and custom chrome. Keep it as code at first. A declarative menu does not require a declarative editor (`@2br/packages/oneput/src/DocumentApp.ts:43`, `:72`, `:102`, `:107`).

## 3. What can become data

| Part | Plain data? | Proposed representation and code boundary |
| --- | --- | --- |
| Menu structure | Yes | Ordered row definitions, stable IDs, row kinds, focus rule, pinned rows, named header/footer widgets. The interpreter builds `Menu` objects. |
| Text and icons | Yes | Literal text or a typed source reference; registered icon names. No HTML or builder callbacks in agent data. Formatting stays in a named projection or formatter. |
| Actions | The intent can | An action ID points to a named event or registered command with validated arguments. Code performs the command. Rows, keys, and layout buttons refer to the same action ID. |
| Key bindings | Yes | Reuse `ActionBinding`: key strings, description, `when.menuOpen`, and `preventDefault`. The existing key controller keeps dispatch and browser activation rules. |
| Layout params | Mostly | Literal or bound title, input kind, and named affordances. An affordance names an action and an enabled source. A registered layout factory stays code. |
| Settings | Yes | An explicit subset of `UIFlags`. Check conflicts with input policy. Keep the existing defaults unless the definition sets a flag. |
| Input and filtering | The policy can | A tagged choice: inherit, filter by a registered filter, submit to an action, or use a registered edit behaviour. Parsing, search, and field writes stay code. |
| Input claims | The configuration can | Owner row ID, activation policy, input kind, value source, named write event, release rules, and restore policy. Reuse the claim implementation. |
| Back levels | The state and intent can | An event for Back and a bound boolean for `hasBackLevel`, or stack-default Back. A model/machine owns the level. Do not create a second hidden level stack in the interpreter. |
| Children opened with `run` | The request can | A registered child definition/factory ID, validated input, and a named result mapping. The runtime creates a fresh child and handles `onResume`. |
| Lifecycle hooks | Selected meanings can | Named start/resume/suspend/exit handlers if needed. Resource ownership and cleanup remain code. Do not expose an arbitrary list of controller commands. |

This extends PROVIDER_PATTERN. It does not replace its model boundary. A provider collates actions and display rules; it does not hold business rules (`packages/oneput/docs/CONCEPTS.md:25`). Existing `ActionProviderEntry` still contains functions, so serializing that type is insufficient (`packages/oneput/src/lib/oneput/lib/ActionProvider.ts:12`).

Keep these in code: domain validation, provider selection, persistence, credentials, network calls, concurrency, cancellation, telemetry, DOM widgets, and platform adapters. Data names a capability. A host registry resolves it. A name gives no authority unless the host grants that capability to this definition.

In @2br, an action handler or machine actor can use Effect services. `ConfigStore` already has typed effects and filesystem, RPC, and null layers (`@2br/packages/config/src/ConfigStore.ts:19`, `:27`, `:75`). Use those services for business work. Keep Effect execution and I/O out of menu rendering.

## 3a. Chrome as data

### The builder already makes a tree

`hflex` and `vflex` choose the container type. Their shared helper fills in an ID, resolves children, and returns a plain object. `fchild` fills in an ID and its type and returns a plain object too. There is one detail beyond filling in `id` and `type`: a `children` callback runs during construction. Its result is an array in the returned tree (`packages/oneput/src/lib/oneput/lib/builder.ts:10`, `:18`, `:35`, `:43`). The output types are `FlexParams` and `FChildParams` (`packages/oneput/src/lib/oneput/types.ts:222`, `:364`).

This tree already describes chrome. StandardLayout builds a horizontal menu header with Back or a spacer, a title child, and Close or a spacer. It also builds input-right buttons and outer status chrome (`packages/oneput/src/lib/oneput/shared/ui/layout/StandardLayout.ts:140`, `:213`, `:236`). This is the real title child inside its header:

```ts
b.fchild({ // One child in the layout-menu-header horizontal group.
  classes: ['oneput__menu-item-header'], // The title's current CSS class.
  textContent: this.menuTitle() // The current title, copied at build time.
}); // Returns an FChildParams object.
```

Source: `packages/oneput/src/lib/oneput/shared/ui/layout/StandardLayout.ts:226`. Real screens add finer structures. ChatUI builds a pinned footer with a Chats button containing an icon and text, a growing spacer, and Retry, Delete, New chat, and More buttons. Retry is conditional on live graph state (`@2br/packages/oneput/src/ChatUI.ts:270`, `:289`, `:293`, `:305`). DocumentApp uses a different path: it wraps the standard layout and supplies `innerUI` from `NavCrumbs.create(current.nav).getUI()` (`@2br/packages/oneput/src/DocumentApp.ts:43`, `:59`). It does not build that chrome directly with `hflex` in this file.

### What keeps the tree from being stored data

Three boundaries need a data form:

- **Functions become event names.** Both tree types allow functions in `attr`. Button helpers put `onClick` into `attr.onclick` (`packages/oneput/src/lib/oneput/types.ts:224`, `:370`; `packages/oneput/src/lib/oneput/lib/builder.ts:173`, `:194`). A description can say `{ on: { click: 'test-key' } }`. The interpreter creates the callback. The host checks the event and handles the key test.
- **Copied values become live source references.** `textContent: 'Key OK'` is a snapshot. A description can say `{ text: { from: 'config.keyStatus' } }`. The interpreter reads the source again when it resolves the tree. Today `watch` subscribes to models; a change schedules `onRefresh`, layout invalidation, menu invalidation, and derived action refresh (`packages/oneput/src/lib/oneput/controllers/AppController.ts:631`, `:657`). This is REFRESH_PATTERN (`packages/oneput/docs/CONCEPTS.md:296`). A binding can use that path. It does not require automatic reactive fields on every tree node. A registered widget can instead use PULL_OBJECT to paint its own node from a live source without a tree rebuild. Its mount and cleanup stay code (`packages/oneput/docs/CONCEPTS.md:206`, `:231`).
- **Free presentation becomes checked choices.** The base worktree types allow `htmlContentUnsafe`, `innerHTMLUnsafe`, free `style`, and free `classes`. They also expose renderer-owned `derivedHTML` (`packages/oneput/src/lib/oneput/types.ts:226`, `:375`). Strings and style objects can be stored, but they do not give the description a bounded, checked presentation contract. SAFE_HTML replaces the unsafe rich-content path; section 6c names that dependency. Use allowed class names or theme tokens and a few named options such as `size`, `tone`, and `emphasis`. Resolve icons by registered name. For special content, name a registered widget with checked props. Keep raw HTML and renderer-owned fields out of the description.

Other function fields need the same boundary. They must not pass through from a stored description:

- Builder `children` callbacks, including nested groups, and helper `onClick` callbacks (`packages/oneput/src/lib/oneput/lib/builder.ts:10`, `:90`, `:97`). Store child arrays and event names.
- `FlexParams.action`, symbol-keyed `attachments`, and `onMount`; `FChildParams.onMount`, including returned cleanup functions (`packages/oneput/src/lib/oneput/types.ts:239`, `:395`). Keep mounts, attachments, and cleanup inside registered widgets. Store action references.
- Layout `menuTitle` functions and affordance `run` and `enabled` functions (`packages/oneput/src/lib/oneput/types.ts:498`, `:578`). Store literal text, source references, and named events.
- StandardLayout's `outerRight` builder callback and its mounted status/date widgets (`packages/oneput/src/lib/oneput/shared/ui/layout/StandardLayout.ts:42`, `:240`, `:266`). Store a named part or widget with checked props.

The tree also permits `voidElements` as a `Set`. That is not a plain JSON value; keep this renderer detail in code (`packages/oneput/src/lib/oneput/types.ts:238`, `:397`). Stable description IDs should supply runtime IDs instead of relying on the builder's random fallback (`packages/oneput/src/lib/oneput/lib/builder.ts:19`, `:46`).

### Slots name where parts can go

Each registered layout should name the places a description may fill. A slot is a place in the existing tree. It does not introduce a new kind of rendered node. The current places have distinct owners:

- `menuUI.layoutHeader` and `layoutFooter` belong to the layout. StandardLayout supplies `layoutHeader` with Back, title, and Close (`packages/oneput/src/lib/oneput/types.ts:176`; `packages/oneput/src/lib/oneput/shared/ui/layout/StandardLayout.ts:213`).
- `menuUI.header` and `footer` belong to the menu. They appear inside the layout header/footer. `Menu.header` and `Menu.footer` already accept trees (`packages/oneput/src/lib/oneput/types.ts:185`, `:283`). The controller preserves these separately from layout chrome (`packages/oneput/src/lib/oneput/controllers/UIController.ts:24`, `:37`).
- `inputUI.left`, `right`, `outerLeft`, and `outerRight` exist in the input contract (`packages/oneput/src/lib/oneput/types.ts:198`). StandardLayout currently supplies `right` for Accept/Reject/Send and `outerRight` for the menu toggle. It has no general part-slot params for input left/right (`packages/oneput/src/lib/oneput/shared/ui/layout/StandardLayout.ts:184`).

Proposed names can be `header` for the menu-owned header, `footer` for the menu-owned footer, and `inputLeft` / `inputRight` for parts beside the input. StandardLayout would need checked params for the input slots and a rule for combining `inputRight` parts with its existing affordances. A part beside the title in the layout-owned header would need a separate slot there. Do not silently replace Back or Close. The controller reads layout output again on invalidation, so slot content must be part of that output, not a one-time `setInputUI` patch (`packages/oneput/src/lib/oneput/controllers/UIController.ts:111`).

A description fills these slots with text, icon, button, badge, spacer, and `hflex` / `vflex` groups. A registered widget covers special content. Suppose the providers screen has a selected provider. It puts a live status badge in the menu-owned header and a Test key button right of the input:

```ts
const chrome = { // Proposed chrome for the selected provider.
  layout: 'standard', // Host registry entry for StandardLayout.
  slots: { // Named places accepted by that layout adapter.
    header: [ // Maps to Menu.header, below Back/title/Close.
      { kind: 'badge', text: { from: 'config.keyStatus' }, tone: 'neutral' } // Shows 'Key OK' now.
    ], // The header has one status badge.
    inputRight: [ // Joins inputUI.right through the proposed slot param.
      { kind: 'button', text: 'Test key', on: { click: 'test-key' } } // Sends the named key-test event.
    ] // The input slot has one button.
  } // The two slot values contain no functions.
}; // This description can be stored and checked.
```

Suppose the test starts. Host code sets the status source to `Testing…`. Its notification triggers the existing refresh path. The interpreter reads the new value and supplies the badge's `textContent`. After success it reads `Key OK`. The stored description does not change. The host owns the command, provider selection, and key access.

These are proposed names and behaviour. ProvidersUI currently watches config and shows `hasKey` in rows. It has no `config.keyStatus` source, status badge, or Test key action. ProviderUI saves a draft key through its config connection (`@2br/packages/oneput/src/ProvidersUI.ts:28`, `:34`, `:43`, `:100`). The example requires a host source and event capability; it does not imply those already exist.

### Code keeps layout and rendering

Layout factories keep responsive structure, CSS, theme-token mappings, default chrome, and accessibility rules in code. The host already installs StandardLayout with registered icon names (`@2br/packages/oneput/src/standardLayout.ts:8`, `:18`). Data selects that factory and fills its allowed slots. A widget registry keeps mount logic and cleanup in code and checks the props supplied by data.

DocumentApp's custom chrome can follow this boundary over time. A registered navigation-crumb widget could take a checked editor-navigation source reference and fill an `inner` slot mapped to `innerUI`. Later its ordinary text, icons, buttons, and groups could become parts if that makes the structure easier to inspect. Editor creation, event subscriptions, and suspension stay code. The current wrapper reads the editor for its crumbs and declares editor changes in `watch` (`@2br/packages/oneput/src/DocumentApp.ts:59`, `:72`, `:90`, `:103`). This does not require a declarative editor.

DECLARATIVE_APPOBJECTS therefore needs no new rendering model. The interpreter resolves sources and events, then gives existing layouts `FlexParams` / `FChildParams` trees. `Flex.svelte` already walks groups and keyed children; `FChild.svelte` already renders text, icons, attributes, and mounted widgets (`packages/oneput/src/lib/oneput/shared/components/Flex.svelte:38`, `:73`; `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:15`, `:44`). Only the inputs become data. Use the SAFE_HTML version of this renderer and its checked write path (section 6c).

## 4. First milestone: a separate declarative demo

Create a third peer in `apps/oneput-demo`. Proposed files go under `src/lib/declarative/`. The page goes at `src/routes/(declarative)/declarative/+page.svelte`. Keep the main demo and `/routed` demo as they are. Do not convert routed Welcome. Existing peers are at `apps/oneput-demo/src/routes/(main)/+page.svelte:1` and `apps/oneput-demo/src/routes/(routed)/routed/+page.svelte:1`.

The new demo edits a simulated provider connection. It uses no real credentials or network. A host control can make the next fetch or key check fail. Another control can rename a provider while the list is open. This makes live updates and failure states visible.

### Screens as data

These are proposed JSON-compatible descriptions, shown as commented TypeScript. `defineViews<DemoSources, DemoEvents>` is a proposed authoring helper, not an existing API. It checks field and event references. JSON from an agent must pass runtime validation and linking too. Every screen below has version 1. Literal strings stay text.

```ts
const views = defineViews<DemoSources, DemoEvents>({ // Host contracts supply the types.
  providers: { // Routed root: a live list, not Welcome.
    version: 1, id: 'providers', title: 'Providers',
    settings: { enableGoBack: false },
    actions: {
      reload: { event: { type: 'RELOAD' } } // Host restarts the simulated fetch.
    },
    menu: {
      id: 'providers', from: 'providers', // Named Source<readonly ProviderRow[], FetchError>.
      loading: { text: 'Loading providers…' },
      failed: { text: 'Providers unavailable', detail: 'message', action: 'reload' },
      ready: {
        empty: { text: 'No providers' },
        each: {
          key: 'id', show: { text: 'name', detail: 'statusText', icon: 'icon' },
          select: { event: 'SELECT_PROVIDER', fields: { providerId: 'id' } },
          closeMenuOnAction: false // Selection sends an event; the machine changes screen.
        }
      }
    }
  },
  edit: { // Routed parent of the colour picker.
    version: 1, id: 'edit', title: { from: 'providerTitle' },
    settings: { enableFilter: false, clearInputAfterAction: false },
    hasBackLevel: true, back: { event: { type: 'BACK' } },
    input: {
      kind: 'text', value: { from: 'draft' },
      change: { event: 'DRAFT_CHANGED', value: 'input' } // Input text is the event payload.
    },
    actions: {
      colour: { child: 'colourPicker', resume: 'colourResult' },
      check: { event: { type: 'CHECK' }, enabled: { from: 'canCheck' } }
    },
    menu: { id: 'edit', items: [
      { id: 'draft', text: { from: 'draftLabel' } },
      { id: 'colour', text: { from: 'colourLabel' }, action: 'colour' },
      { id: 'check', text: 'Check connection', action: 'check' }
    ] }
  },
  checking: { // A source state, not an Effect stored in data.
    version: 1, id: 'checking', title: 'Check connection',
    hasBackLevel: true, back: { event: { type: 'BACK' } },
    actions: { retry: { event: { type: 'RETRY_CHECK' } } },
    menu: {
      id: 'checking', from: 'keyCheck',
      loading: { text: 'Checking…' },
      failed: { text: 'Check failed', detail: 'message', action: 'retry' },
      ready: { show: { text: 'message' } } // CHECK_OK then routes to Done.
    }
  },
  done: {
    version: 1, id: 'done', title: 'Connection checked',
    hasBackLevel: true, back: { event: { type: 'BACK' } },
    actions: { restart: { event: { type: 'RESTART' } } },
    menu: { id: 'done', items: [
      { id: 'receipt', text: { from: 'receiptLabel' } },
      { id: 'restart', text: 'Choose another provider', action: 'restart' }
    ] }
  },
  colourPicker: { // STACK_MODE child; no machine sender is injected.
    version: 1, id: 'colourPicker', title: 'Choose a colour',
    menu: { id: 'colours', from: 'colours', ready: { each: {
      key: 'id', show: { text: 'name' },
      select: { result: { fields: { colour: 'id' } } } // Calls exit with checked data.
    } } },
    back: { cancel: true } // Exits without a payload; it sends no routed event.
  }
});
```

`detail: 'message'` in a failed branch reads only the declared error shape. `show` and `fields` in an `each` branch read only one row. A scalar `ready.show` reads the ready value. Source references use `from` everywhere. Literal rows use `text`; repeated rows use `show.text` to name a row field. No arbitrary property path is accepted. Omitted loading/failed branches are allowed only for sources declared always ready, such as `colours`.

The child registry grants only `colourPicker` to Edit. The named `colourResult` handler is code owned by the routed parent. In `onResume`, it validates `{ colour: 'blue' }` and sends `COLOUR_CHOSEN`. An absent payload means cancel and sends no selection event. A malformed payload produces a visible error. The child never receives the parent's `send`.

### A small machine and its event contract

The host uses an XState machine. Keep machine actions and guards as named code implementations. The state graph itself can be data. This is the complete proposed transition outline; it is not pasted XState configuration.

```text
initial: providers
context: providerId=null, draft='', colour='blue', receipt=null

providers
  SELECT_PROVIDER { providerId: 'openai' } -> form.editing
    selectProvider: recheck current ID; initialise draft for this provider
  RELOAD {} -> providers (restart fetch; keep the current route)

form.editing
  DRAFT_CHANGED { value: 'demo-key' } -> form.editing (context only)
  COLOUR_CHOSEN { colour: 'green' } -> form.editing (context only)
  CHECK {} [canCheck] -> form.checking
  BACK {} -> providers

form.checking
  entry: host starts the keyCheck source for this attempt
  CHECK_OK { receipt: { id: 'r-1', message: 'OpenAI checked' } } -> done
  CHECK_FAILED { error: { _tag: 'RejectedKey', message: 'Key rejected' } }
    -> form.checking (context only; source remains Failed)
  RETRY_CHECK {} -> form.checking (restart attempt; source becomes Loading)
  BACK {} -> form.editing (cancel attempt)

done
  BACK {} -> form.editing
  RESTART {} -> providers (clear draft and receipt)
```

`DemoEvents` is a discriminated union of these exact events and payloads. `CHECK_OK` and `CHECK_FAILED` are host-only. View actions cannot send them. Guards check current state and values again; an enabled source is only display guidance. Opening the picker is a granted stack operation, not a machine transition. The actor stays in `form.editing` while the child is open.

```ts
routeMachine(ctl, actor, { // New demo setup; current routeMachine API.
  providers: () => makeView('providers', host),
  form: {
    editing: () => makeView('edit', host),
    checking: () => makeView('checking', host)
  },
  done: () => makeView('done', host)
}); // The picker is created by the child registry, outside this route map.
```

`makeView` is the proposed single interpreter constructor. It receives a linked immutable definition, permitted events, sources, and child capabilities. It creates Oneput callbacks in code. The interpreter reads snapshots, resolves a pure view, then applies menu, layout, and actions. It has no domain I/O.

Suppose the page opens. The list says `Loading providers…`. After 300 ms it shows `OpenAI` and `Anthropic`. Renaming OpenAI to `OpenAI demo` updates its row without changing ID `openai`. Selecting that row sends `SELECT_PROVIDER { providerId: 'openai' }`. The machine enters `form.editing`.

Suppose input becomes `demo-key`. The input adapter sends `DRAFT_CHANGED { value: 'demo-key' }`. The actor updates its draft signal. Named sources update `draftLabel` and `canCheck` without replacing Edit. Select Choose colour. The stack becomes `[Edit, ColourPicker]`. Selecting Green returns `{ colour: 'green' }`. Edit decides in `onResume` to send `COLOUR_CHOSEN`. The machine remains in `form.editing` and the label becomes `Colour: Green`.

Suppose Check starts and the simulated Effect fails with `RejectedKey`. The source changes Loading -> Failed. The checking screen displays `Check failed` and `Key rejected`. Retry starts a fresh attempt and clears the error. Success produces receipt `r-1`; a host-only event takes the machine to Done. Back during a slow check cancels the attempt. A late result cannot change the resumed form.

The promise adapter has a separate failure path: fail the next provider load, see `Providers unavailable`, then reload successfully. The demo must expose both failures. Do not replace them with console messages.

## 5. ROUTED_MODE, children, and AGENT_MENUS

Use a new `routeMachine` map in the separate demo, as section 4 shows. The current `routeFlow` demonstrates sender injection (`apps/oneput-demo/src/lib/routed/flowMachine.ts:66`). Leave that demo intact. Oneput itself has no `send`; the host supplies it (`packages/oneput/docs/CONCEPTS.md:949`).

The machine owns transitions and guards. The view owns labels and event references. A linked bundle checks that each routed state has a view and that event payloads fit its host contract. An event may validly be ignored in some states; validation must distinguish that from an unknown event.

`routeMachine` walks nested state names and uses the found path as the route key. A factory at a parent state covers its children. Parallel state values and missing mappings currently throw (`packages/oneput/src/lib/oneput/shared/routing/xstate/routeMachine.ts:28`, `:41`, `:55`). Do not imply the new format adds parallel routing.

A context-only machine change does not replace the view when the route key stays the same. Bindings must therefore read a live source, not the context snapshot captured when the factory ran. Use a source adapter over the actor if context drives text or enabled state.

STACK_MODE is part of the first milestone. Use the `child: 'colourPicker', resume: 'colourResult'` request in section 4. The interpreter runs a fresh child and the parent owns the result handler. Cancel without a payload remains distinct from selection. The old routed demo picker only notifies and goes Back (`apps/oneput-demo/src/lib/routed/ColourPicker.ts:15`); the new demo must return a checked colour payload. This follows `packages/oneput/docs/CONCEPTS.md:949`.

While a child runs, `routeApp` waits for its routed parent to become current. If the routed AppObject leaves the stack, it stops its subscriptions. Root exit belongs to the host's `setOnRootExit`, not to the router (`packages/oneput/src/lib/oneput/shared/routing/routeApp.ts:61`, `:83`). Preserve these rules.

For AGENT_MENUS, the proposal is already specific (`@2br/.work/backlog.electron.md:141`):

- The fixed core machine enters `agentMenu` and invokes `agentFlow`.
- The agent supplies machine data, menu definitions, and a state-to-definition map.
- The host validates the whole bundle and supplies allowed action, guard, and service implementations by name. Arbitrary executable machine functions are not agent data.
- One router follows both the core and the active child. Its map gets `agentMenu: fromChild('agentFlow', agentApps)`.
- Child completion takes the core through `onDone` to its next state.

`fromChild` is proposed, not present in the current routing module. Implement it only with the first agent menu, as the appendix requests. It must subscribe to the active child as well as the parent, detach when the child changes, and include the parent/child route path in its key. Parent subscription alone does not establish child-state routing. Inject the child's sender into the child's declarative views. Do not use a second competing router.

## 6. Named sources: the main design contract

A source is a read port. A description names it with `from: 'providers'`. The host declares its value and error types, supplies the implementation, and grants access per view. Names are not permissions. No description can discover other sources or load code.

### One adapted shape

```ts
type Load<T, E> = // Data returned by every fallible adapter.
  | { state: 'loading' }
  | { state: 'ready'; value: T }
  | { state: 'failed'; error: E };

type Source<T, E = never> = // Built on existing Oneput interfaces.
  Pull<Load<T, E>> & Subscribable; // subscribe is required for all adapters.

type ProviderRow = { // Display projection; no credentials or domain objects.
  id: string; name: string; statusText: string; icon: IconName;
};
type FetchError = { _tag: 'FetchFailed'; message: string };
type CheckError = // Host normalises expected failures and unexpected defects.
  | { _tag: 'RejectedKey'; message: string }
  | { _tag: 'Unavailable'; message: string };
type Receipt = { id: string; message: string };
type Colour = 'blue' | 'green';

type DemoSources = { // Expanded view of the inferred registry type; never supplied by an agent.
  providers: Source<readonly ProviderRow[], FetchError>;
  providerTitle: Source<string>;
  draft: Source<string>;
  draftLabel: Source<string>;
  canCheck: Source<boolean>;
  colourLabel: Source<string>;
  colours: Source<readonly { id: Colour; name: string }[]>;
  keyCheck: Source<Receipt, CheckError>;
  receiptLabel: Source<string>;
};
```

`Pull` has `get()` and optional `subscribe()` at `packages/oneput/src/lib/oneput/lib/pull.ts:18`. `Subscribable` makes notification required at `:31`. `cell` and `notifier` already supply local state and notifications at `:43` and `:69`. The new tagged load state is a proposed convention, not an existing Oneput type.

Each registry entry holds a source factory plus runtime descriptors for its ready and error values. A descriptor lists field types, required fields, and permitted icon values; it can also decode an emitted value. An always-ready entry declares that narrower contract. Infer the TypeScript contract from the same descriptors; the expanded `DemoSources` above explains that inferred result. A TypeScript annotation alone is insufficient for JSON.

The registry is code. For example, this proposed builder infers each type from a runtime contract. `text`, `boolean`, `enumOf`, `record`, and `list` below are small descriptor constructors, not expressions in menu data. Each field descriptor also supplies the matching runtime check.

```ts
const providerRows = list(record({ // One source of field/type metadata.
  id: text, name: text, statusText: text, icon: enumOf(grantedIconNames)
}));
const sources = defineSources({ // Each open receives a screen-owned scope.
  providers: source(providerRows, fetchErrorContract, scope =>
    providerProjection(scope, fromPromise(scope, simulateProviderFetch, toFetchError), renames)),
  providerTitle: readySource(text, scope => fromSignal(scope, model.providerTitle)),
  draft: readySource(text, scope => fromSignal(scope, model.draft)),
  draftLabel: readySource(text, scope => fromSignal(scope, model.draftLabel)),
  canCheck: readySource(boolean, scope => fromSignal(scope, model.canCheck)),
  colourLabel: readySource(text, scope => fromSignal(scope, model.colourLabel)),
  colours: readySource(list(record({ id: enumOf(['blue', 'green']), name: text })),
    scope => fromSignal(scope, model.colours)),
  keyCheck: source(receiptContract, checkErrorContract, scope =>
    host.checkAttempt(scope)), // Uses fromEffect; restart is an explicit host event.
  receiptLabel: readySource(text, scope => fromSignal(scope, model.receiptLabel))
});
// SourcesOf<typeof sources> is DemoSources. Its keys also bound valid `from` names.
// Contract inference checks each factory's Source<T, E> against the descriptors.
```

`fetchErrorContract`, `checkErrorContract`, and `receiptContract` describe the exact tagged errors and Receipt fields shown above. `readySource` declares that Loading/Failed are impossible. `source` declares all three states. The host grants only a subset of this registry to each view. Code-derived fields such as `model.draftLabel` are live projections with their own notification bridge; they are not strings evaluated by the interpreter.

For example, the host declares `providers` as a list whose row fields are `id: string`, `name: string`, `statusText: string`, and `icon: IconName`. The linker finds `from: 'providers'`, enters that row scope, and accepts `show: { text: 'name' }`. It rejects `text: 'missing'`, a boolean field used as text, a non-list used with `each`, or an unregistered icon. It verifies `fields: { providerId: 'id' }` against the `SELECT_PROVIDER` payload. Errors include paths such as `views.providers.menu.ready.each.show.text`. Named formatters have checked input/output types too.

The registry also declares which source states are possible. Fallible sources require loading and failed views. Lists require an empty view unless emptiness is excluded by the contract. `key` must name a stable unique scalar field. Check actual keys in each snapshot; malformed or duplicate rows stop that view with a path-based interpreter contract error. Do not invent a domain error of type E for a host contract violation.

### Who supplies sources, and when

The demo page creates a flow host with the actor, local model, source registry, and adapter runtime. `makeView` opens a screen scope for the names referenced by that view. The host owns draft, colour, selected provider, and receipt for the whole flow. These values survive a picker. Screen scopes own fetches, subscriptions, and key-check attempts. No renderer starts work.

- On start, acquire referenced sources and start screen-owned producers. Oneput then subscribes through the interpreter's `watch()`. Attach producer bridges before reading snapshots. Oneput builds an initial menu before attaching `watch`; its immediate scheduled refresh then reads again after attachment. Keep both steps so a change in that gap is not lost.
- `get()` is synchronous, pure, and returns a cached immutable snapshot. It never starts a fetch, Effect, subscription, or state transition. Read each name once per render. Projections that need atomic values read one shared model/actor snapshot.
- `watch()` returns existing source ports. It must not create them. `AppController` subscribes after start/resume and refreshes the view on change (`packages/oneput/src/lib/oneput/controllers/AppController.ts:605`, `:631`, `:657`).
- On suspend, Oneput detaches watchers. The interpreter also closes its screen scope: unsubscribe signal bridges, abort promises, interrupt Effect fibers, and close Stream scopes. Unsubscribing from `watch` alone does not cancel a producer. Cleanup is idempotent.
- On resume, open a fresh screen scope and reattach. Read current flow state. Restart cancelled screen work. In the pilot, provider reads reload on re-entry; no stale cache is implied. Restore draft and colour from the flow model. Never repeat a completed write merely because a view resumes.
- On exit, close the screen scope permanently. On page disposal, stop routing and the actor, and close the flow host. A shared flow-owned producer, if added later, needs explicit ownership and a lease policy; a view must not cancel another view's work.
- Every run has a generation and owner token. Start only if the scope is still open. Publish only while both tokens still match. Abort/interruption requests stop cooperative work; tokens also reject late results from work that ignores cancellation. Retry closes the old attempt before starting the next. Publish errors as Failed; do not publish cancellation as failure.

The ready/error values are checked at adapter publication, not only at description load. A contract violation uses the interpreter diagnostic path; it is separate from a valid Failed<E> value. Keep last-good data only if a future contract explicitly defines stale data. The pilot replaces it with Loading or Failed. Coalesce notifications through Oneput. Do not depend on notification counts.

### Adapters at the host edge

These are proposed adapter signatures and behaviour, not installed APIs. `Scope` owns start/stop resources and the publication token. `Cell` remains private to the adapter; consumers receive only `Source`.

```ts
fromPromise<T, E>( // Takes a factory, never an already-running promise.
  scope: Scope,
  load: (signal: AbortSignal) => Promise<T>,
  error: (cause: unknown) => E
): Source<T, E>; // Loading -> Ready or Failed; abort + token check on close.

fromSignal<T>( // Bridges any local signal library, including Oneput cell.
  scope: Scope,
  signal: Pull<T> & Subscribable
): Source<T>; // Ready(get()); subscribe once; detach bridge on close.

fromEffect<T, E, R>( // Lives in the optional host Effect adapter.
  scope: Scope,
  task: Effect<T, E, R>,
  runtime: Runtime<R>,
  defect: (cause: unknown) => E
): Source<T, E>; // Run a fiber at start; interrupt it on close.

fromStream<T, E, R>( // Same Source contract for multiple values.
  scope: Scope,
  stream: Stream<T, E, R>,
  runtime: Runtime<R>,
  defect: (cause: unknown) => E
): Source<T, E | EmptyStream>; // Loading until first item; Ready per item; Failed on error.
```

`Effect`, `Stream`, and `Runtime` above are conceptual host types. Check the chosen Effect version before implementing adapter calls. The source and interpreter interfaces import none of them. Effect services are supplied by the host runtime/layer. Preserve typed expected errors; map defects into a bounded public error without secrets. Interruption is cleanup, not a `CheckError`.

Suppose the host calls `fromPromise(scope, simulateProviderFetch, toFetchError)`. The factory starts with an AbortSignal and waits 300 ms. Its resolved rows are checked and published. A rename control changes a separate local signal. The named `providers` projection combines fetched rows and those overrides in code and forwards either notification. That final source retains the promise's Loading/Failed states. The description sees only `providers`, not how it was built.

Suppose the host wraps an actor-backed draft signal with `fromSignal`. Input sends an event; the actor changes context; the bridge notifies. `draftLabel` derives `Draft: demo-key` and `canCheck` derives `true` in code. The source does not write the draft. Use a harmless demo value, never a real key in this label.

Suppose CHECK starts the host's simulated `Effect<Receipt, CheckError, DemoService>`. `fromEffect` publishes Loading. A typed `RejectedKey` becomes Failed. Success publishes Ready and the host sends CHECK_OK with the same receipt. Dispatch is outside `get()` and checks the attempt token and machine state. CHECK_FAILED leaves checking current so the error remains visible. RETRY_CHECK explicitly starts a new generation; a context-only change does not remount the route.

The following adapter bodies show the shared mechanism. They are pseudocode. `loadingPort` makes a private cell and a read-only `source`. Its `publish` checks runtime descriptors, scope identity, and generation before updating that cell. `scope.onClose` registers cleanup. The `edge` methods belong to the host adapter, not Oneput or the description.

```ts
// Promise: defer execution until the scope starts; cancel and reject late results.
const port = loadingPort<T, E>(scope, contract);
const abort = new AbortController();
scope.onClose(() => abort.abort());
Promise.resolve().then(async () => {
  if (!scope.isOpen()) return; // The scope may close before this microtask.
  try {
    const value = await load(abort.signal);
    port.publish({ state: 'ready', value });
  } catch (cause) {
    if (!abort.signal.aborted) port.publish({ state: 'failed', error: error(cause) });
  }
});
return port.source; // Closing the scope invalidates publication before aborting.
```

```ts
// Signal: attach first, then take the latest snapshot; no captured first value.
const port = loadingPort<T, never>(scope, contract);
const refresh = () => port.publish({ state: 'ready', value: signal.get() });
const unsubscribe = signal.subscribe(refresh);
scope.onClose(unsubscribe);
refresh();
return port.source; // The host model still owns writes and derived values.
```

```ts
// Effect: edge.fork supplies services, typed failure, defect handling, and interruption.
const port = loadingPort<T, E>(scope, contract);
const fiber = edge.fork(task, {
  success: value => port.publish({ state: 'ready', value }),
  failure: error => port.publish({ state: 'failed', error }),
  defect: cause => port.publish({ state: 'failed', error: defect(cause) })
});
scope.onClose(() => fiber.interrupt()); // Interruption does not call failure.
return port.source;
```

```ts
// Stream: edge.consume owns a scoped fiber and closes its resources on interruption.
const port = loadingPort<T, E | EmptyStream>(scope, streamContract);
let received = false;
const consumer = edge.consume(stream, {
  item: value => { received = true; port.publish({ state: 'ready', value }); },
  failure: error => port.publish({ state: 'failed', error }),
  defect: cause => port.publish({ state: 'failed', error: defect(cause) }),
  complete: () => {
    if (!received) port.publish({ state: 'failed', error: { _tag: 'EmptyStream', message: 'No values' } });
  }
});
scope.onClose(() => consumer.interrupt());
return port.source; // Each publication is a snapshot, never an event delta.
```

For a Stream, the host runs a scoped consumer and publishes each checked item. Define empty completion as Failed with the adapter error `EmptyStream` (included in its error contract); normal completion after an item retains the last Ready value. Stop on failure, and require explicit retry. If events are deltas, a code reducer creates a snapshot before publication; descriptions never reduce events.

Do not add a Stream to the first demo merely to count time. The promise, signal, and Effect already prove its required user actions. A useful later Stream is provider health pushed by a service: `connecting`, `online`, then `offline` while the list stays open. Adapt it into a named status projection and show actual service changes. Add that case when the host has such a feed; the adapter shape above reserves no separate menu language.

For later real menus, keep Themes Default as a row with a null theme value; close only after a successful write (`@2br/packages/oneput/src/ThemesUI.ts:75`, `:94`). Keep provider keys behind config access; real ProviderUI starts with an empty draft and cannot read the saved key (`@2br/packages/oneput/src/ProvidersUI.ts:75`, `:90`, `:120`). Use REFRESH_PATTERN for row presence/order/text and PULL_OBJECT for mounted widgets. Read live `get()` values; stable IDs can preserve mounted widgets (`packages/oneput/src/lib/oneput/lib/pull.ts:10`). Do not build REACTIVE_PROPS.

## 6a. Rule: no expressions in descriptions

Every computed or derived value is a named source or a named formatter implemented in code. A formatter is pure, has checked arguments/results, and returns a bounded display value. It cannot fetch, subscribe, send events, or navigate. Its only arguments are literals and explicit typed references.

| Need | Forbidden data | Use instead |
| --- | --- | --- |
| A combined label | String interpolation with logic, such as `${name || "Unknown"}` | `providerTitle` source, or a registered `providerLabel` formatter. |
| Conditional text, icon, or visibility | `if`, ternary expressions, boolean programs | `statusText`, `icon`, `visibleRows`, or a typed boolean source for a supported enabled field. |
| Counts or totals | Arithmetic such as `items.length + 1` | `itemCountLabel` or `total` source. |
| Search, sort, or selection | Inline filters, predicates, sort callbacks | `filteredProviders` projection in code; input sends a query event. |
| Next screen | Conditional route expressions | Named event; the machine chooses the next state. |
| Load/error presentation | Executable branches | Fixed Loading/Ready/Failed branches, checked against the source contract. |

Field names such as `name` and event payload mappings are finite typed selectors, not expressions. Reject arbitrary paths, templates, scripts, functions, dynamic imports, and executable machine implementations. Adding a formatter requires a host grant; it must not become an expression evaluator under another name.

## 6b. Schema choice and agent-produced descriptions

| Option | Benefit | Cost and fit |
| --- | --- | --- |
| Effect Schema for the format | Composable decoders, inferred types, JSON Schema export; fits @2br's Effect services. | Adds an Effect dependency/version choice to Oneput if used in core. Keep it in an adapter if selected by a host. Installed examples: `@2br/packages/config/node_modules/effect/src/Schema.ts:1397`, `:1535`, `:18253`. |
| Small validator returning neverthrow Results | Fits Oneput's current boundary (`packages/oneput/src/lib/oneput/lib/bindings.ts:26`) and safe-html. Easy to keep pure and synchronous. | Must maintain field checks, error paths, type descriptors, and agent JSON Schema. Scope must stay small; schema drift needs explicit checks. |
| Standard Schema as the integration contract | Lets the consuming app supply its own compatible validator without choosing its runtime library for it. | It is an interface, not a description grammar, validator implementation, linker, or JSON Schema generator. App choice alone does not give agents one stable format. |

**Recommendation: use the small neverthrow validator for the fixed Oneput description format.** Oneput owns that versioned grammar, runtime source descriptors, and canonical agent JSON Schema. Keep validation and linking separate. Let @2br decode its domain values with Effect Schema at the edge. Do not require Effect to display a menu.

Use Standard Schema only as an optional port for host-defined payloads and widget props when that need appears. Convert validation issues to Oneput's error type. Its validation method may be asynchronous, so await it at ingestion before linking; never call it from `menu()` or `get()`. The [Standard Schema specification](https://standardschema.dev/schema) defines validation results and type inference. It does not remove the need for Oneput's canonical format. The installed Effect source has `toStandardSchemaV1` at `@2br/packages/config/node_modules/effect/src/Schema.ts:1397`.

For AGENT_MENUS, publish one versioned JSON Schema for descriptions plus the host's permitted names, source fields, event payloads, and limits. Prefer one small grammar descriptor that emits the built-in validator, TypeScript contract, and JSON Schema. If hand-written checks are simpler for the pilot, maintain a shared accept/reject corpus for decoder/schema parity and resolve drift before the agent milestone. Do not let each host silently redefine version 1. Check the target agent API's supported JSON Schema subset at its boundary.

```ts
type DefinitionIssue = { path: string; code: string; message: string };
// Both operations are pure. Only a successful link can create a runtime view.
decodeDescription(input: unknown): Result<ViewDef, readonly DefinitionIssue[]>;
linkBundle(defs: readonly ViewDef[], grants: HostContracts):
  Result<LinkedBundle, readonly DefinitionIssue[]>;
```

Decode rejects unknown keys, functions, HTML fields, invalid versions, and unbounded documents/trees. Link checks source fields and states, events and payloads, child inputs/results, icons, slot ownership, row IDs, and complete route coverage. Accept a bundle atomically before activation. Validate event values again at dispatch; a selected row can disappear after render. Ignore a known event only when the machine contract allows it in that state. Runtime source values are checked too. Return paths such as `views.edit.actions.colour.child`.

## 6c. Build on SAFE_HTML

Descriptions contain neither HTML nor functions. A string remains text even if it contains `<b>`. Data cannot set raw attributes, event handlers, mounts, attachments, renderer internals, CSS, or SVG geometry. The interpreter creates callbacks for granted event names. Registered layouts/widgets remain code APIs behind checked props.

The interpreter depends on these SAFE_HTML pieces:

- `SAFE_HTML/packages/safe-html/src/SafeHtml.ts:15`, `:22`: opaque `SafeHtml` and `sanitiseHtml`, returning `Result<SafeHtml, Error>`. Only safe-html can create content with runtime authority. Use named `display` or `ui` policy; never the document-preservation policy for UI content.
- `SAFE_HTML/packages/safe-html/src/SafeHtml.ts:67`, `:78`, `:87`: checked markup access, runtime provenance, and `insertSafeHtml`. A cast or a JSON round trip cannot create authority. The fixed insertion context is an HTML div. Failure shows `Content unavailable`; it must never return raw input.
- `SAFE_HTML/packages/oneput/src/lib/oneput/lib/domSafety.ts:43`, `:60`: `checkedElement` and `checkedRichContent`. Existing FChild/Flex renderers use checked tags, attributes, URLs, and styles before writes. Their Svelte rich-content path uses the checked markup reader; an imperative widget uses `insertSafeHtml`. These are two checked consumers of the same package authority, not a claim that every Svelte write calls `insertSafeHtml`.
- `SAFE_HTML/packages/oneput/docs/safe-content.md:38`, `:59`: the common DOM policy and named icon path. Resolve only granted icon names. SAFE_HTML phase 2 is in progress; the current worktree documents checked icon geometry, registration, and rendering. Use that allow-list renderer and its fallback. Do not copy it into the interpreter or accept icon markup/factories from data.

The first demo needs text and named icons only. Later rich content is a named host source or registered widget whose code supplies `SafeHtml`, made only through safe-html. The stored document carries the source/widget name, never markup or a serialized SafeHtml token. This requires a separate rich-value contract; do not let generic text fields accept it. Agent bundle validation is still needed: checked DOM writes do not validate event authority or source access.

This dependency is on the safe-content implementation in `sec/safe-html`, not a second sanitiser in this branch. Confirm its public API and icon work before the demo is implemented. General document SVG, editor import/export, and the explicit KaTeX escape hatch are outside this interpreter contract (`SAFE_HTML/packages/oneput/docs/safe-content.md:92`).

## 7. Input and Back must keep their meanings

The pilot form uses the normal input path with filtering disabled. The runtime turns an actual user input change into `DRAFT_CHANGED`; applying the bound draft back to the input must not emit another semantic write. Restore its value on resume from the flow model. A same-route update must not clear or reset the draft.

Data should select a known input behaviour. It must not bypass INPUT_CLAIM ownership by installing a raw input listener. Raw `input-change` events still exist; the claim path owns semantic writes (`packages/oneput/src/lib/oneput/controllers/InputController.ts:515`).

Suppose a later Provider key row declares claim-on-focus, password input, a draft source, and a write event. The interpreter supplies runtime read/write callbacks to `FocusedMenuLiveEdit`. The model holds the unsaved key. Back first ends the claim. A later Back leaves the form. Nothing stores the key in the view definition, preview export, or telemetry.

Use claim-on-focus only for a suitable unfiltered form. Mixed filtered menus should use activate-to-edit. The existing helper warns about focus claiming input during filtering (`packages/oneput/src/lib/oneput/shared/behaviors/liveEdit/FocusedMenuLiveEdit.ts:13`). Release on owner removal, focus leave, suspend, and exit must use the existing claim rules (`packages/oneput/src/lib/oneput/types.ts:69`, `:126`).

Keep BACK_HANDLING precedence: claim, disabled navigation, imperative Back handler, AppObject Back handler, then stack/root exit (`packages/oneput/src/lib/oneput/controllers/AppController.ts:763`). The interpreter should normally use declarative `onBack`, not `setOnBack`.

For routed Back, name an event. For a local level, bind `hasBackLevel` to the model. For a stack child, use normal stack Back unless it has a discard rule. `canGoBack()` does not infer a destination from the presence of a handler (`packages/oneput/src/lib/oneput/controllers/AppController.ts:824`). A routed root with a meaningful Back event may need `hasBackLevel: true` so the header shows Back; Welcome deliberately disables it. Distinguish that display declaration from the machine's transition guard.

`BindingsEditor` changes title, flags, affordances, and Back handlers for each level (`packages/oneput/src/lib/oneput/shared/appObjects/BindingsEditor.ts:79`, `:117`, `:169`). Do not convert it first. If levels need distinct bindings or cleanup, use child AppObjects or machine states. The ontology gives this rule at `packages/oneput/docs/CONCEPTS.md:889`.

Also preserve synchronous action decline. An action that returns `false` lets the browser handle the key. An asynchronous Effect cannot decide that after dispatch (`packages/oneput/src/lib/oneput/types.ts:465`). Resolve enabled/handled state synchronously, then start business work. Keep native Enter/Space handling in `KeysController` (`packages/oneput/src/lib/oneput/controllers/KeysController.ts:22`).

## 8. Tests and a visible representation

The user asks for graphical and declarative structure, almost all logic tested without I/O, and portable platform boundaries (`@2br/CLAUDE.md:9`). A definition is useful only if a person can inspect both its stored form and its resolved view.

Provide three linked views of the same definition:

- Stored JSON: version, source references, actions, and route IDs. A diff shows a label or binding change directly.
- A resolved tree: layout title, menu, stable rows, their actions, and the values used. Selecting a node shows its definition path and source name.
- A flow graph: machine states and event edges. Selecting a state shows its view. Keep live values separate from the immutable definition.

For example, the first preview can be a text tree:

```text
providers — routed view
  title: Providers
  source: providers — Ready, 2 rows
  row: openai — OpenAI demo
    select: SELECT_PROVIDER { providerId: "openai" } → form.editing
  row: anthropic — Anthropic
    select: SELECT_PROVIDER { providerId: "anthropic" } → form.editing
```

The first demo renders these same definitions with in-memory sources. Its inspection panel can start as a text tree and current machine state. Suppose the host renames `openai` to `OpenAI demo`. The row text changes; its ID and stored definition stay unchanged. Show `providers → repeated row → SELECT_PROVIDER` without exposing secret values. A graphical inspector can follow after the demo proves the contract.

Keep the interpreter in three parts: read a source snapshot, resolve a pure view/intent, then apply it through Oneput. Expose only the definition, typed source/action contracts, and constructor at the package top level. Put schema linking, projection, row adapters, and lifecycle details below that interface. This follows the logic-sandwich and nullable-architecture skills; it does not require new controller state machines.

Tests should check outcomes, not callback counts:

| Layer | Useful cases without external I/O |
| --- | --- |
| Decode and link | Bad version; duplicate row ID; missing action; unknown event/icon/source; wrong payload; source field type mismatch. Error includes its document path. |
| Pure view resolution | Provider names and status; loading/empty/failed lists; field and payload resolution; stable IDs after reorder and rename. |
| Runtime with a real machine | Select `openai`, type `demo-key`, choose Green, and assert actor state and displayed values. Cancel picker without changing colour. Reject malformed child results and unknown events. |
| Source lifetime | Promise success/failure/retry; live signal change; suspend/resume with draft retained; late completion after Back or retry cannot replace current state. Assert source/view outcomes, not subscription counts. |
| Input and Back | Claim owns writes; first Back ends edit; next Back navigates; owner removal releases; disabled Back still lets a claim release. |
| Business work | Null Effect layers provide success, typed failure, and delayed completion. Assert the receipt, visible failure/retry, and no navigation after cancellation. Add Stream empty/completed/failed cases when a real Stream is used. |
| Checked rendering | HTML-looking labels remain text; forged rich values fail closed; unknown icon names cannot inject markup. Reuse SAFE_HTML policy tests rather than duplicate them. |

`Controller.createNull()` and simulation helpers already exist (`packages/oneput/src/lib/oneput/controllers/controller.ts:28`, `:130`). Use existing controller tests for key/DOM integration. Do not claim those simulations are all pure: some use browser events and timers. Keep the schema, linker, projection, and domain tests independent of the DOM. Keep a few renderer checks for appearance and accessibility.

Use Vitest with arrange/act/assert sections. Use real models, machines, and null infrastructure or Effect null layers. Do not use mocks, spies, patched methods, or call-count assertions. Before implementing the higher-level tests, agree which success and failure paths matter most. No tests are added by this report.

For later jsed fixture work, the `jsed-test-cases` skill can make an interactive route under `apps/jsed-demo/src/routes/test-cases/`. It is useful for editor cases; it is not needed for this Oneput demo.

## 9. Options and trade-offs

| Option | Benefit | Cost |
| --- | --- | --- |
| TypeScript configuration with callbacks | Small change; broad current API coverage. | Cannot store it as plain JSON or validate an agent's output fully. Structure still hides in functions. |
| Versioned data plus named capabilities | Can store, validate, preview, and generate menus and chrome. Reuses current controllers, machines, and tree renderer. | Needs typed source contracts, lifecycle/cancellation adapters, a linker, SAFE_HTML rendering, and bounded row/input behaviours. Prove these in the separate demo first. |
| A general expression/workflow language | Can describe more rules inside the document. | Adds a language runtime, debugging rules, execution limits, and a second place for business logic. Harder to inspect. |

Recommend the second option with the schema choice in section 6b. Use fixed load-state branches and typed named projections. The machine owns flow and the model owns rules. No expressions are allowed. A static Welcome conversion would not test the main source and lifecycle risks.

## 10. Small, shippable steps

1. **The separate demo in section 4.** Add the third peer, its small XState machine, five screen descriptions, validator/linker, source registry, and one interpreter. Include promise Loading/Ready/Failed and retry; a signal update while the list stays open; form input events; a stack picker result decided in parent `onResume`; and a typed Effect failure/retry. Bind context changes through live sources without remounting Edit. Cancel work on suspend/exit and reject late results. Use SAFE_HTML text and named icons. Show the current machine state and resolved text tree. Done means the full walk-through works, both failure controls work, malformed references fail before activation, and the main/routed demos remain usable. Agree the key higher-level tests before implementing them.
2. **Stabilise the public contract from demo evidence.** Review source state/error descriptors, row keys, event payload mappings, retry ownership, and child result contracts. Put private validation, linking, lifecycle, and row adapters below a small public interface. Publish version 1 plus the canonical agent JSON Schema and parity checks. Add a shortcut or layout affordance only when the demo has a useful action for it; use the same action path as a row. Confirm SAFE_HTML API and phase 2 icon readiness.
3. **One real menu, recommended Themes.** Use @2br's existing Effect/config boundary as the host. Publish typed theme rows, Default with null, and active-state projection. Preserve order, close-on-success, and visible failure. A real downstream consumer tests the portable contract. No @2br change is part of this report.
4. **Providers and its input form.** Bind graph changes and child results. Keep the code ProviderUI as a child first. Then put draft/save rules in a model and select the existing live-edit behaviour from data. Preserve password/input claims, Back, failure, clearing after save, and cancellation. Add chrome slots only for real requirements with clear ownership.
5. **First agent bundle.** Validate descriptions and restricted machine data together, including grants and route coverage. Keep the core machine fixed. Add the single-router `fromChild` extension only for this case, as AGENT_MENUS requests. Add graphical flow/source inspection when useful. Standard Schema host codecs and rich widgets need concrete uses before inclusion.

Each step must leave a usable flow. These are design milestones, not work authorised by this report. Oneput is greenfield; improve its upstream API if the demo shows a better contract. The demo needs an Effect host dependency or a separate demo edge module; keep that dependency out of Oneput core. Package placement is an open decision, not a reason to skip the Effect case.

Explicitly do not build yet:

- A conversion of routed Welcome, or replacement of the main/routed demos.
- DECLARATIVE_ONEPUT, a controller rewrite, a second router, or `fromChild` before the first agent flow.
- Expressions, templates with logic, inline filters, arbitrary scripts, or a general workflow/graph language.
- A second sanitiser, arbitrary HTML/CSS/SVG in descriptions, executable widgets from agent data, or a universal rich-row schema.
- A Stream solely for a timer or progress animation. Add a real multi-value feed when it serves the screen.
- A graphical authoring tool, cloud sync, runtime snapshot persistence, generic shared-source caching, or transactional claims.

Electron, cloud, and phone hosts can supply adapters later. The format contains no filesystem paths, IPC channels, DOM nodes, fibers, or device-specific coordinates.

## 11. Risks and open decisions

The main risks are source contracts and lifetime, not static row construction.

- **Source type claims can be false.** TypeScript erases types. Host descriptors must validate emitted values and link fields to source shapes. An agent cannot declare an unknown source into existence. The pilot must reject a bad field, wrong row payload, duplicate key, and wrong error shape.
- **Subscriptions do not cancel producers.** `watch` cleanup only detaches notifications. Screen scopes must abort promises, interrupt fibers, close streams, and reject stale publication. Retry must replace the old generation. Flow state survives suspend; screen work does not.
- **One render can mix versions.** Read each source once. Derive related values from one model/actor snapshot. A selected row can disappear; recheck its ID in the handler. If it is gone, stay on Providers and show a bounded message. Do not navigate using the stale row object.
- **Input can feed back into itself.** Separate user-originated input events from applying model values. A picker resume must restore draft and selection without sending a second draft event or clearing the input.
- **A registry can hide rules.** Give each capability a purpose, type contract, owner, and inspectable source link. Keep computed rules in named model projections. Show their names in the inspector. Do not permit opaque arbitrary execution names.
- **Validation is more than shape.** Decode and link atomically before activation. Check runtime events and values too. Keep agent JSON Schema and the built-in validator aligned. Standard Schema alone does not define this format or grant access.
- **Schema maintenance has a cost.** The recommendation is a small neverthrow validator owned by Oneput, with canonical JSON Schema. If the format grows enough to make those checks hard to maintain, reassess a schema library before adding more field kinds. Effect remains an app choice.
- **SAFE_HTML is a dependency under active work.** Use its public SafeHtml authority, checked write path, and phase 2 icon renderer. Do not treat its broad document-preservation policy as a UI policy. Check the current API before implementation; do not duplicate private machinery.
- **Chrome needs explicit ownership.** Keep menu headers separate from layout Back/title/Close. Decide how future input-right parts join existing affordances. One live node has one paint owner. Named styles and widgets need bounded contracts.
- **Navigation has one owner.** Machine state selects the routed view. The child returns data and its parent chooses the event. Current-state/attempt checks must guard all late host events. Stored definitions do not restore an active claim, unsaved draft, or Effect fiber.
- **Inspection can leak secrets.** Grant sources per view and redact sensitive values in previews/traces. The pilot uses harmless demo input. Real provider forms retain the existing write-only credential boundary.

Open decisions for the user, with proposed defaults:

- **Schema:** confirm the small neverthrow validator and canonical JSON Schema. Add Standard Schema only for an actual host codec need. Use Effect Schema inside @2br, not Oneput core.
- **Effect adapter placement:** start in the demo's edge module. Decide after the pilot whether it should become an optional Oneput integration entry point or a separate package.
- **Stream:** omit it from the pilot unless provider-health updates are useful now. If included, use a real multi-value status source and the same loading/error/lifetime contract.
- **Tests and first consumer:** prioritise the end-to-end event/picker path and cancellation/failure path. After the demo, convert Themes first unless another real menu gives better evidence.
- **Agent scope, later:** agree permitted guards, actors, and machine targets before accepting agent machine data. This does not block the human-authored demo.

## 12. Report checks

The update was checked against this worktree, the SAFE_HTML worktree, the listed @2br menus, the installed Effect Schema source, and the linked Standard Schema specification. File citations describe the snapshot read on 12 November 2026; other workers can change them. All types, adapter bodies, and descriptions are design sketches. They were not compiled or run. The adapter bodies use conceptual host operations, not unverified Effect-version API calls.

Only `work/backlog/DECLARATIVE_APPOBJECTS.md` was edited. No implementation, tests, installs, dev servers, format tasks, or Git writes were run. Other trees were read only.

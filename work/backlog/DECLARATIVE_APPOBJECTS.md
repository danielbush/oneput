# DECLARATIVE_APPOBJECTS

Make the common AppObject glue a stored, validated data document that one generic AppObject can interpret. This lets a human or agent describe menus and the small parts around the input and menu header, while models, state machines, and Effect services keep the business rules. The chrome builders already return object trees. Named events, live source bindings, and checked parts in named slots can make their inputs storable data. Layout factories, CSS, and the current tree renderer stay code.

## 1. Scope and recommendation

Use two connected documents: a view definition and, when needed, a flow definition. The view says what to show and which named event an action sends. The flow says what happens next. Neither document contains JavaScript functions.

Start with static standard rows and events. Add live sources, child pickers, and edit behaviours when a real menu needs them. Do not make a general programming language for menus.

This is a design report, not an implementation. All proposed types and functions below are new. Paths without a repo prefix are in `/Users/danb/projects/@oneput`; paths starting with `@2br/` are under `/Users/danb/projects/@2br`. Citations refer to the files read for this report on 12 November 2026. Another worker can change those files and their line numbers.

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

**Welcome and Form: almost all glue.** `Welcome` sets a title, disables Back, builds one row, and sends the machine an event. No business rule is in this class (`apps/oneput-demo/src/lib/routed/Welcome.ts:16`). `Form` also opens a colour picker on the stack, then sends events to continue or return (`apps/oneput-demo/src/lib/routed/Form.ts:21`). The machine owns those transitions (`apps/oneput-demo/src/lib/routed/flowMachine.ts:27`). The source uses uppercase event names; examples below retain those existing string values.

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
- **Free presentation becomes checked choices.** The types allow `htmlContentUnsafe`, `innerHTMLUnsafe`, free `style`, and free `classes`. They also expose renderer-owned `derivedHTML` (`packages/oneput/src/lib/oneput/types.ts:226`, `:375`). Strings and style objects can be stored, but they do not give the description a bounded, checked presentation contract. Use allowed class names or theme tokens and a few named options such as `size`, `tone`, and `emphasis`. Resolve icons by registered name. For special content, name a registered widget with checked props. Keep raw HTML and renderer-owned fields out of the description.

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

DECLARATIVE_APPOBJECTS therefore needs no new rendering model. The interpreter resolves sources and events, then gives existing layouts `FlexParams` / `FChildParams` trees. `Flex.svelte` already walks groups and keyed children; `FChild.svelte` already renders text, icons, attributes, and mounted widgets (`packages/oneput/src/lib/oneput/shared/components/Flex.svelte:38`, `:73`; `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:15`, `:44`). Only the inputs become data. The renderer stays.

## 4. A small format and one interpreter

### First version: static routed views

Use a versioned JSON-compatible document. The first version needs only standard rows, event actions, optional bindings, a title, and the Back flag. This is enough to ship Welcome. It is deliberately smaller than the full table above.

The following schema also defines the TypeScript types. It follows the installed Effect 4 style used by @2br, including `Schema.Literals` and `typeof schema.Type` (`@2br/pnpm-workspace.yaml:10`; `@2br/packages/config/src/Agent.ts:20`). This is proposed code for the report, not code added to a package.

```ts
import { Schema } from 'effect'; // @2br uses Effect 4.1.1.

const BindingSchema = Schema.Struct({ // Example: a shortcut for next.
  bindings: Schema.Array(Schema.String), // Example: ['$mod+n'].
  description: Schema.String, // Example: 'Open the form'.
  when: Schema.optionalKey(Schema.Struct({ // Optional dispatch condition.
    menuOpen: Schema.optionalKey(Schema.Boolean) // Example: true.
  })),
  preventDefault: Schema.optionalKey(Schema.Boolean) // Example: true.
});
const EventSchema = Schema.Struct({ // First version: events without payloads.
  type: Schema.String // Existing demo value: 'NEXT'.
});
const ActionSchema = Schema.Struct({ // Action ID is the map key, e.g. next.
  event: EventSchema, // Example: { type: 'NEXT' }.
  binding: Schema.optionalKey(BindingSchema) // Omit to keep inherited keys.
});
const RowSchema = Schema.Struct({ // One standard action row.
  id: Schema.String, // Example: 'next'.
  text: Schema.String, // Example: 'Next: open the form'.
  icon: Schema.optionalKey(Schema.String), // Registered icon name, if needed.
  action: Schema.String, // Example: 'next', a key in actions.
  closeMenuOnAction: Schema.Boolean // Example: false; make this explicit.
});
const ViewSchema = Schema.Struct({ // A stored view definition.
  version: Schema.Literals([1]), // Format version 1.
  id: Schema.String, // Example: 'welcome'.
  title: Schema.String, // Example: 'Welcome'.
  settings: Schema.Struct({ // Small supported flag set for this version.
    enableGoBack: Schema.Boolean // Example: false for Welcome.
  }),
  actions: Schema.Record(Schema.String, ActionSchema), // Example key: next.
  menu: Schema.Struct({ // Same identity role as today's Menu.
    id: Schema.String, // Example: 'welcome'.
    items: Schema.Array(RowSchema) // Welcome has one row.
  })
});
type ViewDef = typeof ViewSchema.Type; // No separate hand-written type to drift.
type ViewEvent = typeof EventSchema.Type; // Runtime data still needs event checks.
const decodeView = Schema.decodeUnknownEffect(ViewSchema, { // Typed decode failure.
  onExcessProperty: 'error' // Reject a misspelled field rather than drop it.
});
const agentSchema = Schema.toJsonSchemaDocument(ViewSchema); // Agent schema document.
```

The installed Schema source has `decodeUnknownEffect` at `@2br/packages/config/node_modules/effect/src/Schema.ts:1535`, `Record` at `:4024`, and `toJsonSchemaDocument` at `:18253`. Convert its schema document to the agent tool's accepted JSON Schema form at the host boundary. Do not assume every agent API accepts a full schema document unchanged.

Validation has two steps:

1. Decode the document. Reject unknown fields rather than silently dropping them. Enforce limits on strings, row count, and document size at ingestion. Those limits are not shown in this short schema.
2. Link references. Check unique row IDs, action references, icon names, supported version, and allowed machine events. Later, check source types, command argument types, child inputs/results, and route coverage. Return errors with a document path, such as `menu.items[0].action`.

A `Schema.String` for an event name is only structural validation. For a particular machine, export a schema with the allowed event names and payloads. Decode again at the event boundary. TypeScript alone cannot make an agent's JSON safe or well typed.

Keep schema ownership separate from runtime ownership. Oneput currently uses neverthrow in its bindings code (`packages/oneput/src/lib/oneput/lib/bindings.ts:26`). Start with the Effect schema adapter in @2br, or agree to a new Oneput schema entry point. Do not make every Oneput consumer adopt Effect merely to render a view. A shared format must still have one authoritative schema.

### Welcome rewritten as data

Every property below maps to current Welcome code. No new business behaviour is added.

```ts
const welcome = { // Replaces the declarations and menu setup in Welcome.
  version: 1, // Stored format version.
  id: 'welcome', // Definition identity; separate from row identity.
  title: 'Welcome', // Becomes layout.params.menuTitle.
  settings: { enableGoBack: false }, // Becomes AppObject.settings.
  actions: { // Shared action lookup for rows and future keys.
    next: { event: { type: 'NEXT' } } // Becomes injected send({ type: 'NEXT' }).
  },
  menu: { // Becomes the value returned by AppObject.menu().
    id: 'welcome', // Keeps today's menu ID.
    items: [ // Keeps today's row order.
      { // Replaces the stdMenuItem call.
        id: 'next', // Keeps today's row ID.
        text: 'Next: open the form', // Becomes textContent.
        action: 'next', // Resolves actions.next; no stored callback.
        closeMenuOnAction: false // Matches the current builder implementation.
      }
    ]
  }
} satisfies ViewDef; // Checked authoring; external JSON still needs decoding.
```

Source: `apps/oneput-demo/src/lib/routed/Welcome.ts:16`. There is a current documentation mismatch: `stdMenuItem` says its close default is true, but its wrapper uses `closeMenuOnAction ?? false` (`packages/oneput/src/lib/oneput/shared/ui/menuItems/stdMenuItem.ts:60`, `:115`). Set the value explicitly in the format. Do not change that upstream behaviour as part of the first conversion.

### The generic AppObject

One interpreter creates the callbacks needed by Oneput. The stored definition remains data. This sketch assumes a decoded, linked definition, and an injected `send` that validates and forwards only permitted events.

```ts
function declarativeApp( // One interpreter for static routed views.
  def: ViewDef, // Example: welcome above.
  send: (event: ViewEvent) => void // Host adapter forwards the allowed event.
): AppObject {
  const run = (id: string) => send(def.actions[id].event); // next -> NEXT.
  return {
    layout: { params: { menuTitle: def.title } }, // Welcome title.
    settings: def.settings, // Welcome disables Back.
    actions: Object.fromEntries( // Keys use the same event as the row.
      Object.entries(def.actions).map(([id, action]) => [id, {
        action: () => run(id), // Runtime callback, never stored in JSON.
        binding: action.binding // Welcome leaves this undefined.
      }])
    ),
    menu: () => ({ // Rebuilt by Oneput on start, resume, or refresh.
      id: def.menu.id, // welcome.
      items: def.menu.items.map((row) => stdMenuItem({
        id: row.id, // next.
        textContent: row.text, // Next: open the form.
        left: row.icon ? (b) => [b.icon(row.icon)] : undefined, // No icon here.
        closeMenuOnAction: row.closeMenuOnAction, // false.
        action: () => run(row.action) // next resolves to the event.
      }))
    })
  };
}
```

`AppObject` and `stdMenuItem` above refer to the current imports. The sketch has no I/O, custom hooks, source bindings, or command executor. A production constructor must ensure linking cannot be bypassed and hold an immutable definition. Later capabilities belong behind this same small interface, not in a separate interpreter for each menu.

Suppose the user selects “Next: open the form”. The row resolves `next`. The interpreter sends the event. The machine enters `form.editing`. The router creates Form. No menu code decides which state follows Welcome.

Suppose the user changes only the label in stored JSON. The same row ID and action remain. The machine graph stays the same. The preview can show that this edit changes text only.

## 5. ROUTED_MODE, children, and AGENT_MENUS

Use the existing `routeMachine` map. Replace its Welcome factory with a call to `declarativeApp(welcome, sendAdapter)`. Keep the other entries as they are. The injection point already exists in `routeFlow` (`apps/oneput-demo/src/lib/routed/flowMachine.ts:66`). Oneput itself has no `send`; the host supplies it (`packages/oneput/docs/CONCEPTS.md:949`).

The machine owns transitions and guards. The view owns labels and event references. A linked bundle checks that each routed state has a view and that event payloads fit its host contract. An event may validly be ignored in some states; validation must distinguish that from an unknown event.

`routeMachine` walks nested state names and uses the found path as the route key. A factory at a parent state covers its children. Parallel state values and missing mappings currently throw (`packages/oneput/src/lib/oneput/shared/routing/xstate/routeMachine.ts:28`, `:41`, `:55`). Do not imply the new format adds parallel routing.

A context-only machine change does not replace the view when the route key stays the same. Bindings must therefore read a live source, not the context snapshot captured when the factory ran. Use a source adapter over the actor if context drives text or enabled state.

For STACK_MODE, a registered child request may later look like `{ kind: 'run', child: 'colour-picker', input: {}, result: 'colour-chosen' }`. These fields are a later format extension, not part of version 1. The interpreter runs a fresh child. The child gets no routed `send`. On return, the parent validates the payload and maps it to an event. Cancel without a payload must remain distinct from selection. The present demo picker only notifies and goes Back; suppose it later returns a colour, then this result mapping becomes useful (`apps/oneput-demo/src/lib/routed/ColourPicker.ts:15`).

While a child runs, `routeApp` waits for its routed parent to become current. If the routed AppObject leaves the stack, it stops its subscriptions. Root exit belongs to the host's `setOnRootExit`, not to the router (`packages/oneput/src/lib/oneput/shared/routing/routeApp.ts:61`, `:83`). Preserve these rules.

For AGENT_MENUS, the proposal is already specific (`@2br/.work/backlog.electron.md:141`):

- The fixed core machine enters `agentMenu` and invokes `agentFlow`.
- The agent supplies machine data, menu definitions, and a state-to-definition map.
- The host validates the whole bundle and supplies allowed action, guard, and service implementations by name. Arbitrary executable machine functions are not agent data.
- One router follows both the core and the active child. Its map gets `agentMenu: fromChild('agentFlow', agentApps)`.
- Child completion takes the core through `onDone` to its next state.

`fromChild` is proposed, not present in the current routing module. Implement it only with the first agent menu, as the appendix requests. It must subscribe to the active child as well as the parent, detach when the child changes, and include the parent/child route path in its key. Parent subscription alone does not establish child-state routing. Inject the child's sender into the child's declarative views. Do not use a second competing router.

## 6. Live data without code in the menu

Use named read sources backed by `Pull<T>` and, for changing sources, `subscribe`. The host can adapt signals, a graph node, or a machine actor to this interface. `Pull` already has `get` and optional `subscribe` (`packages/oneput/src/lib/oneput/lib/pull.ts:18`). A live source that can change outside this view needs notification.

Later definitions can use a small set of typed references:

```ts
type ValueRef<T> = // Later format sketch; each use is type checked when linked.
  | { literal: T } // Example: { literal: 'Providers' }.
  | { source: string } // Example: { source: 'chat.title' }.
  | { itemField: string }; // Example: { itemField: 'name' } in a repeated row.

type ListRef = { // A repeated row selects a host-owned list projection.
  source: string; // Example: 'config.providerRows'.
  key: string; // Example: 'id'; stable provider identity.
};
```

A repeated template then says: list `config.providerRows`, key `id`, text from item field `name`, status from `statusText`, icon from `statusIcon`, and action `open-provider` with the row's provider ID. Scope field lookup to the declared source shape. Do not allow arbitrary property traversal, JavaScript expressions, or template evaluation.

Suppose the providers graph changes from no key to a saved key. The source projection changes `statusText` and `statusIcon`. Its notification reaches the interpreter's `watch()`. Oneput reads the view again and keeps the stable row identity. The menu has no `if (hasKey)` branch. The rule still exists once, in the projection or model.

This matches current usage: `ProvidersUI.watch` uses `configChanges`, which adapts graph signals to `Subscribable` (`@2br/packages/oneput/src/ProvidersUI.ts:34`; `@2br/packages/oneput/src/configAccess.ts:18`). The interpreter should collect referenced sources and expose their notifications through `watch()`. Oneput already coalesces updates and detaches on suspend/exit (`packages/oneput/src/lib/oneput/controllers/AppController.ts:631`).

For Themes, publish rows containing ID, label, theme name or `null`, and active state. “Default” remains a separate row with `null`. A select action sends the row's theme name to the host. A handler sets the theme and reports success/failure. Preserve the current close-on-success behaviour. Do not close before a failed write. Theme names are display values, not safe IDs by default; give them stable keys.

For Models, a source should expose a tagged load state and rows. Show loading, failure, empty, or ready content using a small state-to-view map. The current code fetches in `onStart` and stores models locally (`@2br/packages/oneput/src/AgentsUI.ts:338`). Move that fetch to a host model/actor when converting this menu. The source owns caching and cancellation. The view never fetches.

For Chats, bind title, status, turns, retry availability, and the chat list from the graph. Keep transcript rendering in a registered rich row. The present `chatSessionItem` call and footer show why a standard text-row schema is not enough for the whole Chat screen (`@2br/packages/oneput/src/ChatUI.ts:255`). Add that renderer only when converting Chat.

Use REFRESH_PATTERN for row presence, ordering, and text. Use PULL_OBJECT for a mounted checkbox or toggle that changes one value without rebuilding. The interpreter can supply a live `get()` closure to existing widgets. It must not capture the first snapshot, since stable IDs can keep a widget mounted (`packages/oneput/src/lib/oneput/lib/pull.ts:10`). Do not build REACTIVE_PROPS for this proposal.

## 7. Input and Back must keep their meanings

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
welcome — routed view
  title: Welcome
  Back: disabled
  menu: welcome
    next: Next: open the form
      action: next → event NEXT → machine form.editing
```

A later preview can render the real menu against an in-memory source fixture. Suppose the fixture changes `activeTheme` from `null` to `Dark`. The tick moves in the preview. The stored definition stays unchanged. A source-edge view can show `theme rows → repeated template → select action` without exposing credentials.

Keep the interpreter in three parts: read a source snapshot, resolve a pure view/intent, then apply it through Oneput. Expose only the definition, typed source/action contracts, and constructor at the package top level. Put schema linking, projection, row adapters, and lifecycle details below that interface. This follows the logic-sandwich and nullable-architecture skills; it does not require new controller state machines.

Tests should check outcomes, not callback counts:

| Layer | Useful cases without external I/O |
| --- | --- |
| Decode and link | Bad version; duplicate row ID; missing action; unknown event/icon/source; wrong payload; source field type mismatch. Error includes its document path. |
| Pure view resolution | Welcome row and title; Themes Default and active tick; provider status text; loading/empty/error list states; stable IDs after reorder. |
| Runtime with a real machine | Select Welcome Next and assert `form.editing` and the displayed menu. Test one invalid event path. |
| Source lifetime | Change a source while current, suspended, and resumed. Assert the final view and preserved draft state, not subscription counts. |
| Input and Back | Claim owns writes; first Back ends edit; next Back navigates; owner removal releases; disabled Back still lets a claim release. |
| Business work | Null Effect layers provide success, failure, and delayed completion. Assert saved state, visible errors, and that late work cannot navigate a new screen. |

`Controller.createNull()` and simulation helpers already exist (`packages/oneput/src/lib/oneput/controllers/controller.ts:28`, `:130`). Use existing controller tests for key/DOM integration. Do not claim those simulations are all pure: some use browser events and timers. Keep the schema, linker, projection, and domain tests independent of the DOM. Keep a few renderer checks for appearance and accessibility.

Use Vitest with arrange/act/assert sections. Use real models, machines, and null infrastructure or Effect null layers. Do not use mocks, spies, patched methods, or call-count assertions. Before implementing the higher-level tests, agree which success and failure paths matter most. No tests are added by this report.

For later jsed fixture work, the `jsed-test-cases` skill can make an interactive route under `apps/jsed-demo/src/routes/test-cases/`. It is useful for editor cases; it is not needed for the Welcome conversion.

## 9. Options and trade-offs

| Option | Benefit | Cost |
| --- | --- | --- |
| TypeScript configuration with callbacks | Small change; broad current API coverage. | Cannot store it as plain JSON or validate an agent's output fully. Structure still hides in functions. |
| Versioned data plus named capabilities | Can store, validate, preview, and generate menus and chrome. Reuses current controllers, machines, and tree renderer. | Needs a linker, source adapters, layout slot contracts, checked widgets, and a bounded set of parts and row/input behaviours. |
| A general expression/workflow language | Can describe more rules inside the document. | Adds a language runtime, debugging rules, execution limits, and a second place for business logic. Harder to inspect. |

Recommend the second option. Use small tagged choices and typed projections, not arbitrary expressions. Let the machine describe flow and the model describe rules. The interpreter should remove repeated wiring, not move every `if` into JSON.

## 10. Small, shippable steps

1. **Welcome only.** Add the static definition, validation/linking boundary, and one interpreter. Replace its factory in `routeFlow`. Show the resolved text tree. Done means Next still reaches `form.editing`, Back stays disabled, and invalid action references fail before display. Do not add a binding merely to exercise the format.
2. **One shared action path.** Convert Confirm or Done. Add bindings or layout affordances only where a real action uses them. Check that rows, shortcuts, and buttons resolve the same action. Preserve inherited binding IDs and browser key behaviour.
3. **Themes as the first data source.** Add typed repeated rows and the active-state projection. Keep config I/O behind its existing boundary. Preserve Default, order, success-close, and failure notification. This proves live values and asynchronous results without a password form.
4. **Providers list.** Bind graph changes and registered child requests. Keep `ProviderUI` as a code child at first. This proves declarative and ordinary AppObjects can share the stack. Preserve Back and resume behaviour.
5. **One input form.** Extract Provider draft/save rules into a model, then select existing live-edit behaviour from data. Test claim ownership, failure, clearing after save, and cancellation before converting Agent forms.
6. **First agent bundle.** Validate menus and machine data together. Add the single-router `fromChild` extension with that real case. Add a machine/view graph and saved definition inspection.

Each step must leave a usable flow. This is a staged implementation plan, not a requirement to preserve old APIs. The projects are greenfield; a cleaner upstream API can replace the current one (`@2br/CLAUDE.md:3`, `:26`).

Do not build yet: DECLARATIVE_ONEPUT, a controller rewrite, a menu expression language, a generic graph engine, a graphical authoring tool, arbitrary HTML/CSS in agent documents, transactional claims, a universal rich-row schema, or cloud sync. Electron, cloud, and phone hosts should supply source/action/layout adapters later. Keep the format free of filesystem paths, IPC channels, DOM nodes, and device-specific layout positions now.

## 11. Risks and open questions

- **Chrome needs explicit ownership and limits.** Check slot names, part kinds, widget props, event references, source types, and allowed theme choices. Define how input-right parts join Accept/Reject/Send. Keep menu-owned headers separate from layout-owned Back/title/Close, and give each live node one paint owner. Free HTML/CSS or a second binding engine would weaken this boundary; the current tree renderer can stay.
- **A registry can hide the rules.** A document full of opaque names is hard to understand. Give each capability a description, input/output schema, and inspectable source link. Put computed rules in the model or graph and show those edges in the visualizer.
- **Validation is more than shape.** Unknown actions, unavailable child inputs, and wrong event payloads need linking. Decide whether a bundle is accepted only as a whole. Recommendation: accept it atomically before activation.
- **Two owners can disagree.** Avoid storing both a view-local navigation state and machine state. View definitions select a state; they do not advance a second flow. Keep display-only projections separate from transition guards.
- **Late asynchronous completion can target a different AppObject.** Scope tasks to their host owner and check current identity before navigation. Cancellation is not enough for a write that already finished. Current Agent save code makes such a check (`@2br/packages/oneput/src/AgentsUI.ts:201`).
- **Source consistency and identity need rules.** Read a consistent projection for each render. Keys must be unique and stable. Re-resolve a selected entity by ID when it can disappear before action time. Define what the user sees if that entity is gone.
- **Stored data is not stored runtime state.** A definition version does not restore a machine snapshot, unsaved draft, input claim, or active Effect fiber. Define persistence of those separately if needed.
- **Secrets must stay out of inspection.** Store source names, not key values. Redact sensitive runtime sources in previews, event traces, and telemetry. The host must limit which sources an agent view can read.
- **Schema placement is undecided.** @2br has Effect 4; Oneput need not require it. Choose an owner for the portable schema and its generated agent schema before moving beyond the pilot.
- **Back availability needs a machine projection.** What proves a routed Back event has a useful destination? Prefer an explicit readable projection, checked with machine tests, over guessing from a handler.
- **Capability growth needs evidence.** Which real menu first needs conditional icons, custom footer buttons, or a registered rich row? Add only that case, with a visible representation and tests, before generalising it.
- **Agent machine scope needs a limit.** Decide which guards, actors, effects, and event targets an agent bundle may name. Keep the core machine fixed and readable as AGENT_MENUS proposes.

## 12. Report checks

This report was checked against the listed local source files and the installed Effect Schema source. The code blocks are design sketches; they were not compiled or run. No installs, dev servers, format tasks, or write operations on Git were used. The only file created for this assignment is `work/backlog/DECLARATIVE_APPOBJECTS.md`.

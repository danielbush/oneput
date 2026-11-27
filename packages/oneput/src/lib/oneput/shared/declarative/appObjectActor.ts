import type { Controller } from '../../controllers/controller.js';
import type { AppActions, AppLayoutParams, AppObject, Menu } from '../../types.js';
import {
  activeInputFocus,
  sourceSubscriptions,
  renderActiveView,
  type OneputView,
  type Readable,
  type LayoutSlots,
  type RowBuilders,
  type RowParams,
  type ViewLayouts,
  type DeclaredSlots,
  type ViewSnapshot,
  type ViewSources
} from './interpreter.js';
import type { OneputEvent } from './oneputEvents.js';

type AttachedViewActor<Snapshot, Event extends { type: string }> = {
  // Function-property syntax keeps `send` contravariant under strictFunctionTypes.
  send: (event: OneputEvent | Event) => void;
  getSnapshot(): Snapshot & {
    can(event: OneputEvent | Event): boolean;
    status?: string;
    output?: unknown;
  };
  subscribe(onChange: () => void): { unsubscribe(): void };
};

type OwnedViewActor<Snapshot, Event extends { type: string }> = AttachedViewActor<
  Snapshot,
  Event
> & {
  start(): void;
  stop(): void;
};

type ActorLifecycle = {
  onStart(): void;
  onExit(): void;
  onBack(): void;
  onDone(output: unknown): void;
};

/** The menu ID and row IDs: what the user sees as "the same rows". */
function rowKey(menu: Menu) {
  return JSON.stringify([menu.id, menu.items.map((item) => item && item.id)]);
}

/**
 * Show the view. The view's focus rule applies only when its rows change (a
 * new menu ID or new row IDs); a redraw of the same rows keeps the focus where
 * the user had it.
 */
function applyView(
  ctl: Controller,
  view: OneputView,
  params: AppLayoutParams,
  rowsChanged: boolean
) {
  ctl.app.applyFlags({
    enableFilter: view.settings.enableFilter,
    enableInputElement: view.settings.enableInputElement,
    enableMenuItemFocus: view.settings.enableMenuItemFocus,
    clearInputAfterAction: view.settings.clearInputAfterAction,
    // A view that gives `inputFocus` decides input focus when the menu opens.
    focusInputOnMenuOpen: view.inputFocus === undefined
  });
  // The view gives all the params of this AppObject each time. This is the
  // one layout redraw per refresh.
  ctl.ui.setParams(params);
  ctl.input.setPlaceholder(view.placeholder);
  // A controlled input: set it only when the machine changed the text.
  if (view.inputValue !== undefined && view.inputValue !== ctl.input.getInputValue()) {
    void ctl.input.setInputValue(view.inputValue);
  }
  // New rows: set the menu now, which runs the view's focus rule. The watch
  // refresh after onRefresh asks for 'none', so it keeps that focus. The same
  // rows: the watch refresh rebuilds them from menu() and keeps the focus.
  if (rowsChanged) ctl.menu.setMenu(view.menu);
}

/** The focus that the adapter last applied, to compare with the next view's. */
type ShownFocus = Pick<OneputView, 'inputFocus' | 'focusItem'>;

/**
 * Apply the view's focus fields only when they change, so a redraw while the
 * user types or moves focus does not take focus back. New rows also apply
 * `focusItem`, because `setMenu` ran the menu's focus rule. The caller forgets
 * the shown focus when Oneput moves focus, and after the user's command: a
 * click on a row blurs the input before the row runs, and the command's state
 * says where focus goes next. Programmatic menu
 * focus gives `ITEM_FOCUSED` with `cause: 'programmatic'`, and input focus
 * gives `INPUT_FOCUS_CHANGED`; a machine that moves to the state it is in
 * changes no field, thus they make no loop.
 */
function applyFocus(ctl: Controller, view: OneputView, shown: ShownFocus, rowsChanged: boolean) {
  if (view.inputFocus !== shown.inputFocus) {
    if (view.inputFocus === 'focused') ctl.input.focus();
    if (view.inputFocus === 'blurred') ctl.input.blur();
  }
  if (view.focusItem !== undefined && (rowsChanged || view.focusItem !== shown.focusItem)) {
    ctl.menu.focusMenuItemById(view.focusItem);
  }
}

/**
 * Connect an actor owned by this AppObject (`STACK_MODE`).
 *
 * - Lifecycle: `onStart` calls `start()` and sends `STARTED`; `onExit` sends
 *   `EXITED` (unless `done` or `stopped`) and calls `stop()`. When
 *   `status === 'done'`, the AppObject exits with `snapshot.output`. Unhandled
 *   `BACK` calls `ctl.app.exit()` when current and the stack can go back.
 * - Rendering: redraws when the snapshot or any {@link Readable} source
 *   changes, switches the layout component when the view's layout changes, and
 *   uses `sources.menuItem.default` for rows without a named builder.
 * - A change of the view's input kind keeps the typed text.
 * - Focus: sends `ITEM_FOCUSED` and `INPUT_FOCUS_CHANGED` while current.
 *   Applies the view's `inputFocus` and `menu.focusItem` when they change
 *   (see {@link applyFocus}). It applies them again after start, resume and
 *   menu open, where Oneput moves focus, and after a row, action or send
 *   control sends its event. While the active view gives `inputFocus`,
 *   Oneput does not focus the input on start, resume or menu open: the view
 *   decides.
 * - Actions and the `inputSend` control send their event only while current
 *   and when the machine can take it; otherwise an action declines.
 * - Not supported: editor and claim views, and menu update and claim release
 *   events.
 */
export function appObjectActor<
  Source,
  List extends string,
  Event extends { type: string },
  Builders extends RowBuilders,
  Layouts extends ViewLayouts,
  Snapshot extends ViewSnapshot<Source, List, Event, RowParams<Builders>, LayoutSlots<Layouts>>
>(
  ctl: Controller,
  actor: OwnedViewActor<Snapshot, Event>,
  sources: ViewSources<NoInfer<Snapshot>, Source, List, NoInfer<Event>, Builders>,
  layouts: Layouts & DeclaredSlots<NoInfer<Snapshot>, NoInfer<Layouts>>
): AppObject {
  const back = { type: 'BACK' } as const;
  const app = createAppObjectActor(ctl, actor, sources, layouts, {
    onStart() {
      actor.start();
      actor.send({ type: 'STARTED' });
    },
    onExit() {
      const status = actor.getSnapshot().status;
      if (status !== 'done' && status !== 'stopped') actor.send({ type: 'EXITED' });
      // An action can exit while the actor still processes an event.
      queueMicrotask(() => actor.stop());
    },
    onBack() {
      if (actor.getSnapshot().status === 'done') return;
      const handled = actor.getSnapshot().can(back);
      actor.send(back);
      if (actor.getSnapshot().status === 'done') return;
      if (!handled && ctl.app.isCurrent(app) && ctl.app.canGoBack()) ctl.app.exit();
    },
    onDone(output) {
      if (ctl.app.isCurrent(app)) ctl.app.exit(output);
    }
  });
  return app;
}

/**
 * Attach a parent-owned actor to an AppObject (`ROUTED_DECL`).
 *
 * Shares rendering with {@link appObjectActor}, except the parent machine owns
 * the actor's lifecycle:
 * - `onStart` sends `STARTED` without calling `start()`.
 * - `onExit` does not send `EXITED` or call `stop()`.
 * - `onBack` sends `BACK` if current and active (`!done`, `!stopped`), and never calls `ctl.app.exit()`.
 * - When `status === 'done'`, skips redrawing and lets the parent's `onDone` transition.
 */
export function attachAppObjectActor<
  Source,
  List extends string,
  Event extends { type: string },
  Builders extends RowBuilders,
  Layouts extends ViewLayouts,
  Snapshot extends ViewSnapshot<Source, List, Event, RowParams<Builders>, LayoutSlots<Layouts>>
>(
  ctl: Controller,
  actor: AttachedViewActor<Snapshot, Event>,
  sources: ViewSources<NoInfer<Snapshot>, Source, List, NoInfer<Event>, Builders>,
  layouts: Layouts & DeclaredSlots<NoInfer<Snapshot>, NoInfer<Layouts>>
): AppObject {
  const app = createAppObjectActor(ctl, actor, sources, layouts, {
    onStart() {
      actor.send({ type: 'STARTED' });
    },
    onExit() {
      // The parent machine owns child termination; sending EXITED here could
      // trigger parent onDone and re-enter routing during external replacement.
    },
    onBack() {
      const status = actor.getSnapshot().status;
      if (ctl.app.isCurrent(app) && status !== 'done' && status !== 'stopped') {
        actor.send({ type: 'BACK' });
      }
    },
    onDone() {}
  });
  return app;
}

// Type inference invariants (shared across appObjectActor, attachAppObjectActor, and createAppObjectActor):
// - `actor` infers `Snapshot` and `Event`; `sources` infers `Source`, `List`, and `Builders`; `layouts` infers `Layouts`.
// - `NoInfer` stops `sources` from inferring `Snapshot` (from source callbacks) or `Event` (from row `send`).
// - Constraining `Snapshot` rather than intersecting rejects views with only undeclared slots;
//   `DeclaredSlots` catches undeclared slots alongside declared ones.
function createAppObjectActor<
  Source,
  List extends string,
  Event extends { type: string },
  Builders extends RowBuilders,
  Layouts extends ViewLayouts,
  Snapshot extends ViewSnapshot<Source, List, Event, RowParams<Builders>, LayoutSlots<Layouts>>
>(
  ctl: Controller,
  actor: AttachedViewActor<Snapshot, Event>,
  sources: ViewSources<NoInfer<Snapshot>, Source, List, NoInfer<Event>, Builders>,
  layouts: Layouts & DeclaredSlots<NoInfer<Snapshot>, NoInfer<Layouts>>,
  lifecycle: ActorLifecycle
): AppObject {
  const sendIfCurrent = (event: OneputEvent | Event) => {
    if (ctl.app.isCurrent(app)) actor.send(event);
  };
  /**
   * Send the event of an action or the send control if the machine can take
   * it now. False when it does not. As for a row, the user's command applies
   * the view's focus again (see {@link applyFocus}).
   */
  const accept = (event: OneputEvent | Event) => {
    if (!ctl.app.isCurrent(app) || !actor.getSnapshot().can(event)) return false;
    actor.send(event);
    shownFocus = {};
    return true;
  };
  const back = { type: 'BACK' } as const;
  let menu: Menu = { id: '', items: [] };
  let actions: AppActions = {};
  let shownLayout: string | undefined;
  let shownRows: string | undefined;
  let shownFocus: ShownFocus = {};
  let stopInputFocus = () => {};
  /**
   * Oneput clears the menu and moves focus when this AppObject starts or
   * resumes, so the next refresh sets the rows and focus again.
   */
  const forgetShown = () => {
    shownRows = undefined;
    shownFocus = {};
  };
  /**
   * Run after the start or resume event, before Oneput's own input focus. A
   * view that gives `inputFocus` owns input focus: Oneput's focus would send
   * `INPUT_FOCUS_CHANGED` and move a `'blurred'` state before the refresh.
   * The event can exit or replace this AppObject; then the flags are not its.
   */
  const yieldInputFocus = () => {
    if (!ctl.app.isCurrent(app) || activeInputFocus(actor.getSnapshot()) === undefined) return;
    ctl.app.applyFlags({ focusInputOnStart: false });
  };

  const app: AppObject = {
    menu: () => menu,
    // A function, so Oneput reads the actions and their keys again on each refresh.
    actions: () => actions,
    onStart() {
      forgetShown();
      // Subscribe first: STARTED can exit this AppObject at once, and onExit
      // then unsubscribes.
      stopInputFocus = ctl.input.subscribeFocusChange((focused) =>
        sendIfCurrent({ type: 'INPUT_FOCUS_CHANGED', focused })
      );
      lifecycle.onStart();
      yieldInputFocus();
    },
    onSuspend() {
      actor.send({ type: 'SUSPENDED' });
    },
    onResume(result) {
      forgetShown();
      actor.send({ type: 'RESUMED', result: result?.payload });
      yieldInputFocus();
    },
    onExit() {
      stopInputFocus();
      lifecycle.onExit();
    },
    hasBackLevel: () => actor.getSnapshot().can(back),
    onBack: lifecycle.onBack,
    onMenuItemFocus({ menuId, menuItem, index, cause }) {
      sendIfCurrent({ type: 'ITEM_FOCUSED', menuId, id: menuItem?.id, index, cause });
    },
    onInputChange({ value }) {
      sendIfCurrent({ type: 'INPUT_CHANGED', value });
    },
    watch: () => [
      {
        subscribe(onChange) {
          let previous = actor.getSnapshot();
          const subscription = actor.subscribe(() => {
            const next = actor.getSnapshot();
            if (next === previous) return;
            previous = next;
            onChange();
          });
          return () => subscription.unsubscribe();
        }
      },
      // Oneput moves menu focus when the menu opens, and it cannot focus a
      // row while the menu is closed: apply the view's focus again.
      {
        subscribe: (onChange) =>
          ctl.events.on('menu-open-change', (open) => {
            if (!open) return;
            shownFocus = {};
            onChange();
          })
      },
      // All readable sources, not only those the active view reads: a change
      // to an unused one costs one coalesced refresh, and the set stays fixed.
      ...sourceSubscriptions(sources)
    ],
    onRefresh() {
      const snapshot = actor.getSnapshot();
      if (snapshot.status === 'done') {
        lifecycle.onDone(snapshot.output);
        return;
      }
      const rendered = renderActiveView(snapshot, sources, layouts, {
        activate: (event: Event) => {
          sendIfCurrent(event);
          shownFocus = {};
        }
      });
      if (rendered.isErr()) {
        ctl.notify(rendered.error);
        return;
      }
      menu = rendered.value.menu;
      actions = Object.fromEntries(
        Object.entries(rendered.value.actions).map(([id, { send, binding }]) => [
          id,
          { action: () => send !== undefined && accept(send), binding }
        ])
      );
      const { name, create } = rendered.value.layout;
      const send = rendered.value.inputSend?.send;
      const params: AppLayoutParams =
        send === undefined
          ? rendered.value.layout.params
          : {
              ...rendered.value.layout.params,
              inputSend: {
                run: () => void accept(send),
                enabled: () => actor.getSnapshot().can(send)
              }
            };
      if (name !== shownLayout) {
        // Show the component; applyView sets its params. A child inherits it,
        // and Oneput shows it again when this AppObject resumes.
        ctl.ui.setLayout(create(ctl, params));
        shownLayout = name;
      }
      const rows = rowKey(rendered.value.menu);
      applyView(ctl, rendered.value, params, rows !== shownRows);
      applyFocus(ctl, rendered.value, shownFocus, rows !== shownRows);
      shownRows = rows;
      shownFocus = { inputFocus: rendered.value.inputFocus, focusItem: rendered.value.focusItem };
    }
  };

  return app;
}

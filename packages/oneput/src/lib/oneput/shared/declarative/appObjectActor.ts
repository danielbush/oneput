import type { Controller } from '../../controllers/controller.js';
import type { AppObject, Menu } from '../../types.js';
import {
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
function applyView(ctl: Controller, view: OneputView, rowsChanged: boolean) {
  ctl.app.applyFlags({
    enableFilter: view.settings.enableFilter,
    enableInputElement: view.settings.enableInputElement,
    enableMenuItemFocus: view.settings.enableMenuItemFocus,
    clearInputAfterAction: view.settings.clearInputAfterAction
  });
  // The view gives all the params of this AppObject each time. This is the
  // one layout redraw per refresh.
  ctl.ui.setParams(view.layout.params);
  ctl.input.setPlaceholder(view.placeholder);
  // New rows: set the menu now, which runs the view's focus rule. The watch
  // refresh after onRefresh asks for 'none', so it keeps that focus. The same
  // rows: the watch refresh rebuilds them from menu() and keeps the focus.
  if (rowsChanged) ctl.menu.setMenu(view.menu);
}

/**
 * Connect an actor that this AppObject owns (`STACK_MODE`).
 *
 * `onStart` starts the actor and sends `STARTED`; `onExit` sends `EXITED` and
 * stops the actor. When the actor reaches a `final` state (`status === 'done'`),
 * the AppObject exits with `snapshot.output`. Unhandled `BACK` exits when the
 * stack can go back.
 *
 * `layouts` are the layouts that the actor's views can name, shared across AppObjects.
 * The row builders are in `sources.menuItem`; its `default` builder draws the
 * rows that do not name a builder.
 * When the active view names a layout other than the one this AppObject shows,
 * the adapter shows that layout's component.
 *
 * The view redraws when the actor has a new snapshot, and when any readable
 * source changes (see {@link Readable}).
 *
 * Which argument decides each type parameter: `actor` decides `Snapshot` and
 * `Event`; `sources` decides `Source` (the slot source types), `List` (the
 * list names) and `Builders` (the row builders); `layouts` decides `Layouts`.
 * `NoInfer` keeps `sources` from deciding them too: `Snapshot` from the
 * parameter types of its source functions (with an xstate actor, that
 * candidate wins and fails the constraint), and `Event` from the list rows'
 * `send`.
 * The constraint on `Snapshot` checks the actor's views against the others.
 * It is a constraint, not an intersection with the snapshot type, so that a
 * view filling only a slot the layout does not declare (a misspelt one) is an
 * error. {@link DeclaredSlots} on `layouts` catches such a slot beside
 * declared ones, which the constraint allows: TypeScript has no exact types.
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
 * Attach a parent-owned actor to an AppObject (`ROUTED_MODE`).
 *
 * The parent machine owns the actor's lifecycle (for example an invoked child
 * under `fromChild`). `onStart` sends `STARTED` without calling `start()`;
 * `onExit` neither sends `EXITED` nor calls `stop()`, because the parent
 * machine owns child termination. `onBack` sends `BACK` to the active actor
 * and never calls `ctl.app.exit()`. When the actor reaches `done`, the adapter
 * skips redrawing and lets the parent's `onDone` move on.
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
  const back = { type: 'BACK' } as const;
  let menu: Menu = { id: '', items: [] };
  let shownLayout: string | undefined;
  let shownRows: string | undefined;

  const app: AppObject = {
    menu: () => menu,
    onStart: lifecycle.onStart,
    onSuspend() {
      actor.send({ type: 'SUSPENDED' });
    },
    onResume(result) {
      actor.send({ type: 'RESUMED', result: result?.payload });
    },
    onExit: lifecycle.onExit,
    hasBackLevel: () => actor.getSnapshot().can(back),
    onBack: lifecycle.onBack,
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
        activate: sendIfCurrent
      });
      if (rendered.isErr()) {
        ctl.notify(rendered.error);
        return;
      }
      menu = rendered.value.menu;
      const { name, create, params } = rendered.value.layout;
      if (name !== shownLayout) {
        // Show the component; applyView sets its params. A child inherits it,
        // and Oneput shows it again when this AppObject resumes.
        ctl.ui.setLayout(create(ctl, params));
        shownLayout = name;
      }
      const rows = rowKey(rendered.value.menu);
      applyView(ctl, rendered.value, rows !== shownRows);
      shownRows = rows;
    }
  };

  return app;
}

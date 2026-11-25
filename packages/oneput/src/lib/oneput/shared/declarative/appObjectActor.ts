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
 * Connect an actor owned by this AppObject (`STACK_MODE`).
 *
 * - Lifecycle: `onStart` calls `start()` and sends `STARTED`; `onExit` sends
 *   `EXITED` (unless `done` or `stopped`) and calls `stop()`. When
 *   `status === 'done'`, the AppObject exits with `snapshot.output`. Unhandled
 *   `BACK` calls `ctl.app.exit()` when current and the stack can go back.
 * - Rendering: redraws when the snapshot or any {@link Readable} source
 *   changes, switches the layout component when the view's layout changes, and
 *   uses `sources.menuItem.default` for rows without a named builder.
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

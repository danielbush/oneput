import type { Controller } from '../../controllers/controller.js';
import type { AppObject, Menu } from '../../types.js';
import {
  sourceSubscriptions,
  renderActiveView,
  type OneputView,
  type Readable,
  type LayoutSlots,
  type PlainRowBuilder,
  type ViewLayouts,
  type ViewSnapshot,
  type ViewSources
} from './interpreter.js';
import type { OneputEvent } from './oneputEvents.js';

type ViewActor<Snapshot, Event extends { type: string }> = {
  start(): void;
  stop(): void;
  send(event: OneputEvent | Event): void;
  getSnapshot(): Snapshot & { can(event: OneputEvent | Event): boolean };
  subscribe(onChange: () => void): { unsubscribe(): void };
};

export type AppObjectActorOptions = {
  /** Build rows whose view has no `build` name. */
  defaultRow: PlainRowBuilder;
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
 * Connect an actor to its AppObject. Oneput owns the AppObject stack and the input.
 * `layouts` are the layouts that the actor's views can name, shared across AppObjects.
 * `defaultRow` builds the rows that do not name a builder.
 * When the active view names a layout other than the one this AppObject shows,
 * the adapter shows that layout's component.
 *
 * The view redraws when the actor has a new snapshot, and when any readable
 * source changes (see {@link Readable}).
 */
export function appObjectActor<
  Source extends string,
  List extends string,
  Event extends { type: string },
  Item extends string,
  Layouts extends ViewLayouts,
  Snapshot
>(
  ctl: Controller,
  actor: ViewActor<
    Snapshot & ViewSnapshot<Source, List, Event, Item, NoInfer<LayoutSlots<Layouts>>>,
    Event
  >,
  sources: ViewSources<NoInfer<Snapshot>, Source, List, Event, Item>,
  layouts: Layouts,
  { defaultRow }: AppObjectActorOptions
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
    onStart() {
      actor.start();
      actor.send({ type: 'STARTED' });
    },
    onSuspend() {
      actor.send({ type: 'SUSPENDED' });
    },
    onResume(result) {
      actor.send({ type: 'RESUMED', result: result?.payload });
    },
    onExit() {
      actor.send({ type: 'EXITED' });
      // An action can exit while the actor still processes an event.
      queueMicrotask(() => actor.stop());
    },
    hasBackLevel: () => actor.getSnapshot().can(back),
    onBack() {
      const handled = actor.getSnapshot().can(back);
      actor.send(back);
      if (!handled && ctl.app.isCurrent(app) && ctl.app.canGoBack()) ctl.app.exit();
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
      // All readable sources, not only those the active view reads: a change
      // to an unused one costs one coalesced refresh, and the set stays fixed.
      ...sourceSubscriptions(sources)
    ],
    onRefresh() {
      const rendered = renderActiveView(actor.getSnapshot(), sources, layouts, {
        defaultRow,
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

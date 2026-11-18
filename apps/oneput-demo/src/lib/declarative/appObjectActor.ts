import type { AppObject, Controller } from '@oneput/oneput';
import {
  renderActiveView,
  type OneputView,
  type ViewSnapshot,
  type ViewSources
} from './interpreter.js';
import type { OneputEvent } from './oneputEvents.js';

type ViewActor<
  Context,
  Source extends string,
  List extends string,
  ReleaseSource extends string
> = {
  start(): void;
  stop(): void;
  send: (event: OneputEvent) => void;
  getSnapshot(): ViewSnapshot<Context, Source, List, ReleaseSource> & {
    can: (event: OneputEvent) => boolean;
  };
  subscribe(onChange: () => void): { unsubscribe(): void };
};

/**
 * Stub for a Oneput update that applies the layout, settings, menu and input together.
 * For focusBehaviour 'none', keep the current row ID for that menu.
 * Save and restore that ID when a view temporarily replaces the menu.
 * Keep the input claim for the same owner. For views with filtering disabled, clear any held
 * filter after acquiring the claim but before publishing rows and focus. Keep the saved query.
 * Release the previous claim with the filter view's reason before restoring or clearing input.
 * Send each release once and ignore late callbacks from replaced claims.
 * Clear and focus the filter input on first entry.
 * Avoid repeating a menu update when its feedback event leaves the view the same.
 */
export type ApplyView = (ctl: Controller, view: OneputView) => void;

/** Give the AppObject's actor Oneput events and refresh its view while current. */
export function appObjectActor<
  Context,
  Source extends string,
  List extends string,
  ReleaseSource extends string
>(
  ctl: Controller,
  actor: ViewActor<Context, Source, List, ReleaseSource>,
  sources: ViewSources<Context, Source, List, ReleaseSource>,
  apply: ApplyView
): AppObject {
  const send = (event: OneputEvent) => actor.send(event);
  const sendIfCurrent = (event: OneputEvent) => {
    if (ctl.app.isCurrent(app)) send(event);
  };
  const back = { type: 'BACK' } as const;

  const app: AppObject = {
    onStart() {
      actor.start();
      send({ type: 'STARTED' });
    },
    onSuspend() {
      send({ type: 'SUSPENDED' });
    },
    onResume(result) {
      send({ type: 'RESUMED', result: result?.payload });
    },
    onExit() {
      send({ type: 'EXITED' });
      // A machine action can exit while the actor is still processing the current event.
      queueMicrotask(() => actor.stop());
    },
    hasBackLevel: () => actor.getSnapshot().can(back),
    onBack() {
      const handled = actor.getSnapshot().can(back);
      send(back);
      // Stub: after normalizing Back, Oneput must use its internal stack pop.
      // An imperative setOnBack handler or an auto-release claim can bypass this hook today.
      if (!handled && ctl.app.isCurrent(app) && ctl.app.canGoBack()) ctl.app.exit();
    },
    onMenuOpenChange({ open }) {
      send({ type: open ? 'MENU_OPENED' : 'MENU_CLOSED' });
    },
    onMenuItemFocus({ menuId, menuItem, index, cause }) {
      send({ type: 'ITEM_FOCUSED', menuId, id: menuItem?.id, index, cause });
    },
    onMenuUpdate({ menuId, menuItem, index, cause }) {
      send({ type: 'MENU_UPDATED', menuId, id: menuItem?.id, index, cause });
    },
    onInputChange({ value }) {
      send({ type: 'INPUT_CHANGED', value });
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
      }
    ],
    onRefresh() {
      const rendered = renderActiveView(
        ctl,
        actor.getSnapshot(),
        () => actor.getSnapshot().context,
        sources,
        {
          activate: (id) => sendIfCurrent({ type: 'ITEM_ACTIVATED', id }),
          change: (value) => sendIfCurrent({ type: 'INPUT_CHANGED', value }),
          release: (id, reason) => sendIfCurrent({ type: 'INPUT_RELEASED', id, reason })
        }
      );
      if (rendered.isErr()) ctl.notify(rendered.error);
      else apply(ctl, rendered.value);
    }
  };

  return app;
}

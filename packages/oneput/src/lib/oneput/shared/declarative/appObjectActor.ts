import type { Controller } from '../../controllers/controller.js';
import type { AppObject } from '../../types.js';
import {
  renderActiveView,
  type OneputView,
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

export type ApplyView = (ctl: Controller, view: OneputView) => void;

/** Connect an actor to its AppObject. Oneput owns the AppObject stack and the input. */
export function appObjectActor<
  Source extends string,
  List extends string,
  Event extends { type: string },
  Snapshot
>(
  ctl: Controller,
  actor: ViewActor<Snapshot & ViewSnapshot<Source, List, Event>, Event>,
  sources: ViewSources<NoInfer<Snapshot>, Source, List, Event>,
  applyView: ApplyView
): AppObject {
  const sendIfCurrent = (event: OneputEvent | Event) => {
    if (ctl.app.isCurrent(app)) actor.send(event);
  };
  const back = { type: 'BACK' } as const;

  const app: AppObject = {
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
      }
    ],
    onRefresh() {
      const rendered = renderActiveView(actor.getSnapshot(), sources, sendIfCurrent);
      if (rendered.isErr()) ctl.notify(rendered.error);
      else applyView(ctl, rendered.value);
    }
  };

  return app;
}

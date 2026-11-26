/**
 * The lifecycle of one state machine actor and its `ROUTED_MODE` routing.
 * It has no import from XState: any XState actor fits {@link RoutableActor}.
 */
import type { Controller } from '../../../controllers/controller.js';
import {
  routeMachine,
  type AppMap,
  type MachineActor,
  type MachineSnapshot,
  type StateValue
} from './routeMachine.js';

/**
 * The part of an XState actor that {@link createActorRouter} uses. The event
 * parameter of `send` is `never` here, so that an actor with any event type
 * fits. The router keeps the actor's own `send` type.
 */
export type RoutableActor = MachineActor<MachineSnapshot> & {
  start(): unknown;
  stop(): unknown;
  send(event: never): void;
};

/** Format a state value as a dot-separated path, for example `form.confirm`. */
function pathOf(value: StateValue): string {
  return typeof value === 'string'
    ? value
    : Object.entries(value)
        .map(([name, child]) => (child ? `${name}.${pathOf(child)}` : name))
        .join(', ');
}

/**
 * Connect `actor` to Oneput with {@link routeMachine}. `appsFor` gives the
 * route map. Give an actor that is not started: the router starts and stops it.
 *
 * Call `start` one time only, because a stopped XState actor cannot start
 * again. `stop` runs automatically when Oneput destroys the controller that
 * was given to `start`.
 */
export function createActorRouter<A extends RoutableActor>(
  actor: A,
  appsFor: (ctl: Controller, send: A['send']) => AppMap<ReturnType<A['getSnapshot']>, A>
) {
  /** The controller given to `start`. It is set only while the router runs. */
  let startedCtl: Controller | undefined;
  let routing: ReturnType<typeof routeMachine> | undefined;
  let stateSubscription: { unsubscribe(): void } | undefined;
  let unregisterDestroy: (() => void) | undefined;

  const send = ((event: never) => actor.send(event)) as A['send'];

  /**
   * Route from the current state, and stop the routing that is there. Use it
   * after a root exit. Throws if the router does not run.
   */
  const reattach = () => {
    if (!startedCtl) throw new Error('createActorRouter: reattach needs a started router');
    routing?.stop();
    const next = routeMachine(startedCtl, actor, appsFor(startedCtl, send));
    // The first `onStart` can stop the router before there is a handle to keep.
    if (!startedCtl) next.stop();
    else routing = next;
  };

  /**
   * Stop the routing, the `onState` reports and the actor. The AppObject stack
   * does not change. It has no effect if the router does not run.
   */
  const stop = () => {
    if (!startedCtl) return;
    startedCtl = undefined;
    routing?.stop();
    stateSubscription?.unsubscribe();
    unregisterDestroy?.();
    routing = stateSubscription = unregisterDestroy = undefined;
    actor.stop();
  };

  /**
   * Start the actor and show the AppObject for each state. `onState` gets the
   * state path now and on each change. If the start fails, it calls `stop` and
   * throws the error again.
   */
  const start = (ctl: Controller, { onState }: { onState?: (state: string) => void } = {}) => {
    startedCtl = ctl;
    try {
      // First, so that a callback below can destroy `ctl` and stop the router.
      unregisterDestroy = ctl.onDestroy(stop);
      actor.start();
      if (!startedCtl) return;
      if (onState) {
        const report = () => onState(pathOf(actor.getSnapshot().value));
        // Subscribe before routing: an AppObject can send from its onStart.
        stateSubscription = actor.subscribe(report);
        report();
      }
      // `onState` can stop the router.
      if (!startedCtl) return;
      reattach();
    } catch (error) {
      stop();
      throw error;
    }
  };

  return { start, stop, reattach, send };
}

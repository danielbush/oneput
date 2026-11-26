import type { Controller } from '@oneput/oneput';
import { routeMachine, type AppMap } from '@oneput/oneput/shared/routing/xstate/routeMachine.js';
import {
  createActor,
  type Actor,
  type AnyStateMachine,
  type SnapshotFrom,
  type StateValue
} from 'xstate';

/** Format an XState state value as a dot-separated path, for example `form.confirm`. */
function pathOf(value: StateValue): string {
  return typeof value === 'string'
    ? value
    : Object.entries(value)
        .map(([name, child]) => (child ? `${name}.${pathOf(child)}` : name))
        .join(', ');
}

/**
 * Make an actor for `machine` and connect it to Oneput with `routeMachine`.
 * `appsFor` gives the route map. The returned handle has the lifecycle of the
 * actor and its routing.
 */
export function createMachineRouter<M extends AnyStateMachine>(
  machine: M,
  appsFor: (ctl: Controller, send: Actor<M>['send']) => AppMap<SnapshotFrom<M>, Actor<M>>
) {
  const actor = createActor(machine);
  let routing: ReturnType<typeof routeMachine> | undefined;
  const send: Actor<M>['send'] = (event) => actor.send(event);
  /** Route from the current state. Call it again only after the routing stopped. */
  const reattach = (ctl: Controller) => {
    routing = routeMachine(ctl, actor, appsFor(ctl, send));
  };

  return {
    /** Start the machine and show the AppObject for each state. */
    start(ctl: Controller) {
      actor.start();
      reattach(ctl);
    },
    /** Stop the routing and the machine. */
    stop() {
      routing?.stop();
      actor.stop();
    },
    /** Call `onChange` with the state now and on each change. Returns an unsubscribe function. */
    onState(onChange: (state: string) => void) {
      const report = ({ value }: { value: StateValue }) => onChange(pathOf(value));
      report(actor.getSnapshot());
      const subscription = actor.subscribe(report);
      return () => subscription.unsubscribe();
    },
    send,
    reattach
  };
}

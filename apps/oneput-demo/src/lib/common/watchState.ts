import type { Controller } from '@oneput/oneput';
import type {
  MachineActor,
  MachineSnapshot,
  StateValue
} from '@oneput/oneput/shared/routing/xstate/routeMachine.js';

/** Format a state value as a dot-separated path, for example `form.confirm`. */
export function pathOf(value: StateValue): string {
  return typeof value === 'string'
    ? value
    : Object.entries(value)
        .map(([name, child]) => (child ? `${name}.${pathOf(child)}` : name))
        .join(', ');
}

/**
 * For the state display of the demo pages. Give `onChange` the state path of
 * `actor` now and on each change, until Oneput destroys `ctl`.
 */
export function watchState(
  ctl: Controller,
  actor: MachineActor<MachineSnapshot>,
  onChange: (state: string) => void
) {
  const report = () => onChange(pathOf(actor.getSnapshot().value));
  report();
  const subscription = actor.subscribe(report);
  ctl.onDestroy(() => subscription.unsubscribe());
}

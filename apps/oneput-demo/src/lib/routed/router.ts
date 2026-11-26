import { createActor, setup, type StateValue } from 'xstate';
import type { Controller } from '@oneput/oneput';
import { routeMachine } from '@oneput/oneput/shared/routing/xstate/routeMachine.js';
import { Welcome } from './apps/Welcome.js';
import { Form } from './apps/form/Form.js';
import { Confirm } from './apps/form/Confirm.js';
import { Done } from './apps/form/Done.js';
import type { Online } from '../common/online.js';
import { createAsyncSearchApp } from '../shared/asyncSearchDeclarative/appObject.js';
import type { SearchService } from '../service/SearchService.js';

/** Events that the routed AppObjects send. */
export type AppEvent =
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'RESTART' }
  | { type: 'SEARCH' };
/** EXITED comes from the page, when a routed AppObject exits (a root exit). */
export type FlowEvent = AppEvent | { type: 'EXITED' };
export type Send = (event: AppEvent) => void;

/** Format an XState state value as a dot-separated path, for example `form.confirm`. */
function pathOf(value: StateValue): string {
  return typeof value === 'string'
    ? value
    : Object.entries(value)
        .map(([name, child]) => (child ? `${name}.${pathOf(child)}` : name))
        .join(', ');
}

/**
 * The routed demo flow. The AppObjects send events, and the machine chooses
 * the screen. The route map has the shape of the machine: `form` has child
 * states, so its entry is a map of them. The host uses the returned handle and
 * owns `online`.
 */
export function createRouter({ search, online }: { search?: SearchService; online: Online }) {
  const asyncSearch = createAsyncSearchApp({ search, online });
  const machine = setup({
    types: { events: {} as FlowEvent },
    actors: { asyncSearch: asyncSearch.machine }
  }).createMachine({
    id: 'routed-demo',
    initial: 'welcome',
    on: {
      EXITED: {
        target: '.welcome',
        description: 'A routed AppObject exited, which it should not do. Start again.'
      }
    },
    states: {
      welcome: {
        description: 'Start the demo.',
        on: {
          NEXT: { target: 'form', description: 'Open the form.' },
          SEARCH: { target: 'search', description: 'Open declarative async search.' }
        }
      },
      form: {
        description: 'Fill in the form, then confirm it.',
        initial: 'editing',
        states: {
          editing: {
            description: 'Open a child picker, or go on to confirm.',
            on: {
              NEXT: { target: 'confirm', description: 'Check the form.' },
              BACK: { target: '#routed-demo.welcome', description: 'Return to the start.' }
            }
          },
          confirm: {
            description: 'Confirm the form, or edit it again.',
            on: {
              NEXT: { target: '#routed-demo.done', description: 'Finish the form.' },
              BACK: { target: 'editing', description: 'Edit the form again.' }
            }
          }
        }
      },
      done: {
        description: 'The form is complete.',
        on: {
          BACK: { target: 'form.confirm', description: 'Return to the confirm step.' },
          RESTART: { target: 'welcome', description: 'Start again.' }
        }
      },
      search: {
        description: 'Run declarative async search.',
        invoke: {
          id: 'search',
          src: 'asyncSearch',
          onDone: { target: 'welcome', description: 'Return to welcome when search finishes.' }
        }
      }
    }
  });

  const actor = createActor(machine);
  let routing: ReturnType<typeof routeMachine> | undefined;
  const send = (event: FlowEvent) => actor.send(event);

  /** The complete map from machine states to Oneput AppObjects. */
  const route = (ctl: Controller) =>
    routeMachine(ctl, actor, {
      welcome: () => Welcome.create(ctl, send),
      form: {
        editing: () => Form.create(ctl, send),
        confirm: () => Confirm.create(ctl, send)
      },
      done: () => Done.create(ctl, send),
      search: asyncSearch.fromChild(ctl, 'search')
    });

  return {
    /** Start the flow and show the AppObject for each state. */
    start(ctl: Controller) {
      actor.start();
      routing = route(ctl);
    },
    /** Stop the routing and the flow. */
    stop() {
      routing?.stop();
      actor.stop();
    },
    send,
    /** Call `onChange` with the state now and on each change. Returns an unsubscribe function. */
    onState(onChange: (state: string) => void) {
      onChange(pathOf(actor.getSnapshot().value));
      const subscription = actor.subscribe((snapshot) => onChange(pathOf(snapshot.value)));
      return () => subscription.unsubscribe();
    },
    /**
     * Use after a root exit: the stack is empty and the routing has stopped.
     * Tell the machine, then route again from its new state.
     */
    recoverFromExit(ctl: Controller) {
      send({ type: 'EXITED' });
      routing = route(ctl);
    }
  };
}

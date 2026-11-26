import { setup, type ActorRefFrom } from 'xstate';
import type { Controller } from '@oneput/oneput';
import { fromChild, routeMachine } from '@oneput/oneput/shared/routing/xstate/routeMachine.js';
import { Welcome } from './apps/Welcome.js';
import { Form } from './apps/form/Form.js';
import { Confirm } from './apps/form/Confirm.js';
import { Done } from './apps/form/Done.js';
import type { Online } from '../common/online.js';
import {
  attachAsyncSearchAppObject,
  type AsyncSearchActor
} from '../shared/asyncSearchDeclarative/appObject.js';
import { createAsyncSearchMachine } from '../shared/asyncSearchDeclarative/machine.js';

/** Events that the routed AppObjects send. */
export type AppEvent =
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'RESTART' }
  | { type: 'SEARCH' };
/** EXITED comes from the page, when a routed AppObject exits (a root exit). */
export type FlowEvent = AppEvent | { type: 'EXITED' };
export type Send = (event: AppEvent) => void;

/** Only the AppObjects send events. The machine chooses the screen. */
export const flowMachine = setup({
  types: { events: {} as FlowEvent },
  actors: { asyncSearch: createAsyncSearchMachine() }
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

/**
 * The complete map from machine states to Oneput AppObjects. It has the shape
 * of the machine: `form` has child states, so its entry is a map of them.
 */
export function routeFlow(
  ctl: Controller,
  actor: ActorRefFrom<typeof flowMachine>,
  online: Online
) {
  const send: Send = (event) => actor.send(event);
  return routeMachine(ctl, actor, {
    welcome: () => Welcome.create(ctl, send),
    form: {
      editing: () => Form.create(ctl, send),
      confirm: () => Confirm.create(ctl, send)
    },
    done: () => Done.create(ctl, send),
    search: fromChild('search', (_, child: AsyncSearchActor) =>
      attachAsyncSearchAppObject(ctl, child, online)
    )
  });
}

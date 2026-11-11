import { setup, type ActorRefFrom } from 'xstate';
import type { Controller } from '@oneput/oneput';
import { routeMachine } from '@oneput/oneput/shared/routing/xstate/routeMachine.js';
import { Welcome } from './Welcome.js';
import { Form } from './Form.js';
import { Confirm } from './Confirm.js';
import { Done } from './Done.js';

export type FlowEvent = { type: 'NEXT' } | { type: 'BACK' } | { type: 'RESTART' };
export type Send = (event: FlowEvent) => void;

/** Only the AppObjects send events. The machine chooses the screen. */
export const flowMachine = setup({
  types: { events: {} as FlowEvent }
}).createMachine({
  id: 'routed-demo',
  initial: 'welcome',
  states: {
    welcome: {
      description: 'Start the demo.',
      on: { NEXT: { target: 'form', description: 'Open the form.' } }
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
    }
  }
});

/**
 * The complete map from machine states to Oneput AppObjects. It has the shape
 * of the machine: `form` has child states, so its entry is a map of them.
 */
export function routeFlow(ctl: Controller, actor: ActorRefFrom<typeof flowMachine>) {
  const send: Send = (event) => actor.send(event);
  return routeMachine(ctl, actor, {
    welcome: () => Welcome.create(ctl, send),
    form: {
      editing: () => Form.create(ctl, send),
      confirm: () => Confirm.create(ctl, send)
    },
    done: () => Done.create(ctl, send)
  });
}

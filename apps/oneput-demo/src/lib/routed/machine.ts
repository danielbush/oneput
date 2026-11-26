import { setup } from 'xstate';
import type { createAsyncSearchMachine } from '../shared/asyncSearchDeclarative/machine.js';

/** Events that the routed AppObjects send. */
type AppEvent = { type: 'NEXT' } | { type: 'BACK' } | { type: 'RESTART' } | { type: 'SEARCH' };
export type Send = (event: AppEvent) => void;

/**
 * The statechart of the routed demo flow. The screens send events, and the
 * machine chooses the next state.
 */
export function createMachine(asyncSearchMachine: ReturnType<typeof createAsyncSearchMachine>) {
  return setup({
    types: { events: {} as AppEvent },
    actors: { asyncSearch: asyncSearchMachine }
  }).createMachine({
    id: 'routed-demo',
    initial: 'welcome',
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
}

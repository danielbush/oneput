import { setup, type ActorRefFrom } from 'xstate';
import { routeApp, type Controller } from '@oneput/oneput';
import { Welcome } from './Welcome.js';
import { Form } from './Form.js';
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
      description: 'Open a child picker, or finish the form.',
      on: {
        NEXT: { target: 'done', description: 'Finish the form.' },
        BACK: { target: 'welcome', description: 'Return to the start.' }
      }
    },
    done: {
      description: 'The form is complete.',
      on: {
        BACK: { target: 'form', description: 'Return to the form.' },
        RESTART: { target: 'welcome', description: 'Start again.' }
      }
    }
  }
});

/** This is the complete map from machine states to Oneput AppObjects. */
export function routeFlow(ctl: Controller, actor: ActorRefFrom<typeof flowMachine>) {
  const send: Send = (event) => actor.send(event);
  const apps = {
    welcome: () => Welcome.create(ctl, send),
    form: () => Form.create(ctl, send),
    done: () => Done.create(ctl, send)
  };

  return routeApp(
    ctl,
    // source: an xstate machine (Actor) wrapped in a get/subscribe (Pull).
    {
      get: () => actor.getSnapshot(),
      subscribe: (onChange) => {
        const subscription = actor.subscribe(onChange);
        return () => subscription.unsubscribe();
      }
    },
    // appFor:
    (snapshot) => apps[snapshot.value](),
    // key:
    (snapshot) => snapshot.value
  );
}

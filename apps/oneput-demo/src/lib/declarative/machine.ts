import { setup } from 'xstate';
import type { createAsyncSearchMachine } from '../shared/asyncSearchDeclarative/machine.js';
import type { createKatexMachine } from '../shared/katexDeclarative/machine.js';
import type { rootMenu } from './apps/rootMenu.js';

/**
 * The statechart of the declarative demo flow. It is only a router: it has no
 * views. Each screen is an invoked child. The root menu finishes with the demo
 * to open. Each demo returns to the root when it finishes. The caller gives
 * the child machines, so this module has no Oneput code at run time.
 */
export function createMachine(actors: {
  rootMenu: typeof rootMenu.machine;
  asyncSearch: ReturnType<typeof createAsyncSearchMachine>;
  katex: ReturnType<typeof createKatexMachine>;
}) {
  return setup({
    actors
  }).createMachine({
    id: 'declarative-demo',
    initial: 'root',
    states: {
      root: {
        description: 'Show the root menu.',
        invoke: {
          id: 'root',
          src: 'rootMenu',
          onDone: [
            {
              guard: ({ event }) => event.output === 'search',
              target: 'search',
              description: 'Open declarative async search.'
            },
            {
              guard: ({ event }) => event.output === 'katex',
              target: 'katex',
              description: 'Open the KaTeX demo.'
            }
          ]
        }
      },
      search: {
        description: 'Run declarative async search.',
        invoke: {
          id: 'search',
          src: 'asyncSearch',
          onDone: { target: 'root', description: 'Return to the root when search finishes.' }
        }
      },
      katex: {
        description: 'Run the declarative KaTeX demo.',
        invoke: {
          id: 'katex',
          src: 'katex',
          onDone: { target: 'root', description: 'Return to the root when KaTeX finishes.' }
        }
      }
    }
  });
}

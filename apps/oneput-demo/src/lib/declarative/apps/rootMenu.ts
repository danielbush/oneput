import type { OneputEvent } from '@oneput/oneput/shared/declarative/oneputEvents.js';
import { setup } from 'xstate';
import { declarativeApp, type DefaultView } from '../../common/declarative.js';

/** Events that the root menu rows send. */
type RootMenuEvent = { type: 'OPEN_SEARCH' } | { type: 'OPEN_KATEX' };

/** The demo that the user chose. It is the output of the machine. */
type RootMenuChoice = 'search' | 'katex';

/**
 * The root menu of the declarative demo. A row finishes the machine, and the
 * output tells the parent which demo to open. The machine has no `BACK`
 * transition, so the root menu has no Back.
 */
function createRootMenuMachine() {
  return setup({
    types: {
      events: {} as OneputEvent | RootMenuEvent,
      meta: {} as { view?: DefaultView<RootMenuEvent> },
      output: {} as RootMenuChoice
    }
  }).createMachine({
    id: 'declarative-root',
    description: 'Show the root menu of the declarative demo.',
    initial: 'menu',
    // XState types the output of a final state as `unknown` here.
    output: ({ event }) => event.output as RootMenuChoice,
    states: {
      menu: {
        description: 'Choose a demo.',
        meta: {
          view: {
            layout: 'standard',
            params: { menuTitle: 'Declarative demo' },
            menu: {
              id: 'declarative-root',
              items: [
                {
                  id: 'search',
                  params: { text: 'Async search (declarative)...' },
                  send: { type: 'OPEN_SEARCH' }
                },
                {
                  id: 'katex',
                  params: { text: 'KaTeX demo (declarative)...' },
                  send: { type: 'OPEN_KATEX' }
                }
              ]
            },
            settings: { enableFilter: true, enableInputElement: true }
          }
        },
        on: {
          OPEN_SEARCH: { target: 'openSearch', description: 'Choose async search.' },
          OPEN_KATEX: { target: 'openKatex', description: 'Choose the KaTeX demo.' }
        }
      },
      openSearch: {
        type: 'final',
        output: 'search' satisfies RootMenuChoice,
        description: 'The user chose async search.'
      },
      openKatex: {
        type: 'final',
        output: 'katex' satisfies RootMenuChoice,
        description: 'The user chose the KaTeX demo.'
      }
    }
  });
}

/** The root menu: its machine, and how to show an invoked actor of it (`ROUTED_DECL`). */
export const rootMenu = declarativeApp(createRootMenuMachine());

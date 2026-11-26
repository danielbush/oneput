import type { AppObject, Controller } from '@oneput/oneput';
import { attachAppObjectActor } from '@oneput/oneput/shared/declarative/appObjectActor.js';
import type { ViewFor } from '@oneput/oneput/shared/declarative/interpreter.js';
import type { OneputEvent } from '@oneput/oneput/shared/declarative/oneputEvents.js';
import { standardRow } from '@oneput/oneput/shared/declarative/standardRow.js';
import { setup, type ActorRefFrom } from 'xstate';
import { viewLayouts } from '../../common/layout.js';

/** The root menu shows only fixed rows, so it has no slot or menu sources. */
const content = { slot: {}, menu: {}, menuItem: { default: standardRow } };

/** Events that the root menu rows send. */
type RootMenuEvent = { type: 'OPEN_SEARCH' } | { type: 'OPEN_KATEX' };

/** The demo that the user chose. It is the output of the machine. */
type RootMenuChoice = 'search' | 'katex';

type RootMenuView = ViewFor<typeof content, typeof viewLayouts, RootMenuEvent>;

/**
 * The root menu of the declarative demo. A row finishes the machine, and the
 * output tells the parent which demo to open. The machine has no `BACK`
 * transition, so the root menu has no Back.
 */
export function createRootMenuMachine() {
  return setup({
    types: {
      events: {} as OneputEvent | RootMenuEvent,
      meta: {} as { view?: RootMenuView },
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
                  params: { text: 'KaTeX demo (stub)...' },
                  send: { type: 'OPEN_KATEX' }
                }
              ]
            },
            settings: { enableFilter: true, enableInputElement: true }
          }
        },
        on: {
          OPEN_SEARCH: { target: 'openSearch', description: 'Choose async search.' },
          OPEN_KATEX: { target: 'openKatex', description: 'Choose the KaTeX stub.' }
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
        description: 'The user chose the KaTeX stub.'
      }
    }
  });
}

export type RootMenuActor = ActorRefFrom<ReturnType<typeof createRootMenuMachine>>;

/** Attach an invoked root menu actor to a Oneput AppObject (`ROUTED_DECL`). */
export function attachRootMenuAppObject(ctl: Controller, actor: RootMenuActor): AppObject {
  return attachAppObjectActor(ctl, actor, content, viewLayouts);
}

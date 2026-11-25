import type { Controller } from '@oneput/oneput';
import { attachAppObjectActor } from '@oneput/oneput/shared/declarative/appObjectActor.js';
import type { ViewFor } from '@oneput/oneput/shared/declarative/interpreter.js';
import type { OneputEvent } from '@oneput/oneput/shared/declarative/oneputEvents.js';
import { standardRow } from '@oneput/oneput/shared/declarative/standardRow.js';
import { fromChild, routeMachine } from '@oneput/oneput/shared/routing/xstate/routeMachine.js';
import { setup, type ActorRefFrom } from 'xstate';
import { viewLayouts } from '../common/layout.js';
import type { Online } from '../common/online.js';
import {
  attachAsyncSearchAppObject,
  type AsyncSearchActor
} from '../shared/asyncSearchDeclarative/appObject.js';
import { createAsyncSearchMachine } from '../shared/asyncSearchDeclarative/machine.js';
import type { SearchService } from '../service/SearchService.js';
import {
  attachKatexStubAppObject,
  createKatexStubMachine,
  type KatexStubActor
} from './katexStub.js';

/** Events that the root menu rows send. */
type RootEvent = { type: 'OPEN_SEARCH' } | { type: 'OPEN_KATEX' };

/** The root menu shows only fixed rows, so it has no slot or menu sources. */
const rootContent = { slot: {}, menu: {}, menuItem: { default: standardRow } };

type RootView = ViewFor<typeof rootContent, typeof viewLayouts, RootEvent>;

/**
 * The declarative demo flow. The root menu is a view of this machine; each
 * other screen is an invoked declarative child that returns to the root when
 * it finishes. The root has no Back: the declarative AppObjects never exit.
 */
export function createAppMachine(search?: SearchService) {
  return setup({
    types: { events: {} as OneputEvent | RootEvent, meta: {} as { view?: RootView } },
    actors: {
      asyncSearch: createAsyncSearchMachine(search),
      katexStub: createKatexStubMachine()
    }
  }).createMachine({
    id: 'declarative-demo',
    initial: 'root',
    states: {
      root: {
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
          OPEN_SEARCH: { target: 'search', description: 'Open declarative async search.' },
          OPEN_KATEX: { target: 'katex', description: 'Open the KaTeX stub.' }
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
        description: 'Show the KaTeX stub.',
        invoke: {
          id: 'katex',
          src: 'katexStub',
          onDone: { target: 'root', description: 'Return to the root when the stub finishes.' }
        }
      }
    }
  });
}

export type AppActor = ActorRefFrom<ReturnType<typeof createAppMachine>>;

/** Map each machine state to a declarative AppObject. The host owns `online`. */
export function routeAppFlow(ctl: Controller, actor: AppActor, online: Online) {
  return routeMachine(ctl, actor, {
    root: () => attachAppObjectActor(ctl, actor, rootContent, viewLayouts),
    search: fromChild('search', (_, child: AsyncSearchActor) =>
      attachAsyncSearchAppObject(ctl, child, online)
    ),
    katex: fromChild('katex', (_, child: KatexStubActor) => attachKatexStubAppObject(ctl, child))
  });
}

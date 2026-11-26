import type { Controller } from '@oneput/oneput';
import { fromChild, routeMachine } from '@oneput/oneput/shared/routing/xstate/routeMachine.js';
import { setup, type ActorRefFrom } from 'xstate';
import type { Online } from '../common/online.js';
import {
  attachAsyncSearchAppObject,
  type AsyncSearchActor
} from '../shared/asyncSearchDeclarative/appObject.js';
import { createAsyncSearchMachine } from '../shared/asyncSearchDeclarative/machine.js';
import type { SearchService } from '../service/SearchService.js';
import { katexStub } from './apps/katexStub.js';
import { rootMenu } from './apps/rootMenu.js';

/**
 * The declarative demo flow. This machine is only a router: it has no views.
 * Each screen is an invoked declarative child. The root menu finishes with the
 * demo to open. Each demo returns to the root when it finishes.
 */
export function createAppMachine(search?: SearchService) {
  return setup({
    actors: {
      rootMenu: rootMenu.machine,
      asyncSearch: createAsyncSearchMachine(search),
      katexStub: katexStub.machine
    }
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
              description: 'Open the KaTeX stub.'
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
    root: rootMenu.fromChild(ctl, 'root'),
    search: fromChild('search', (_, child: AsyncSearchActor) =>
      attachAsyncSearchAppObject(ctl, child, online)
    ),
    katex: katexStub.fromChild(ctl, 'katex')
  });
}

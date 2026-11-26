import { createActorRouter } from '@oneput/oneput/shared/routing/xstate/actorRouter.js';
import { createActor } from 'xstate';
import type { Online } from '../common/online.js';
import type { SearchService } from '../service/SearchService.js';
import { createAsyncSearchApp } from '../shared/asyncSearchDeclarative/appObject.js';
import { Confirm } from './apps/form/Confirm.js';
import { Done } from './apps/form/Done.js';
import { Form } from './apps/form/Form.js';
import { Welcome } from './apps/Welcome.js';
import { createMachine } from './machine.js';

/**
 * Connect the routed demo flow to Oneput. The route map has the shape of the
 * machine: `form` has child states, so its entry is a map of them. The host
 * uses the returned handle and owns `online`.
 */
export function createRouter({ search, online }: { search?: SearchService; online: Online }) {
  const asyncSearch = createAsyncSearchApp({ search, online });
  const actor = createActor(createMachine(asyncSearch.machine));
  const { start, stop, send, reattach } = createActorRouter(actor, (ctl, send) => ({
    welcome: () => Welcome.create(ctl, send),
    form: {
      editing: () => Form.create(ctl, send),
      confirm: () => Confirm.create(ctl, send)
    },
    done: () => Done.create(ctl, send),
    search: asyncSearch.fromChild(ctl, 'search')
  }));

  return {
    actor,
    start,
    stop,
    send,
    /**
     * Use after a root exit: the stack is empty and the routing has stopped.
     * Tell the machine, then route again from its new state.
     */
    recoverFromExit() {
      send({ type: 'EXITED' });
      reattach();
    }
  };
}

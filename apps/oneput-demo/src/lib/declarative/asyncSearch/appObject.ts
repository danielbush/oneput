import type { AppObject, Controller } from '@oneput/oneput';
import { createActor } from 'xstate';
import { appObjectActor, type ApplyView } from '../appObjectActor.js';
import { createAsyncSearchMachine } from './machine.js';
import type { SearchService } from './searchService.js';
import { sources } from './sources.js';

/** Connect the search actor to Oneput. The host supplies the immediate menu state reader. */
export function createAsyncSearchAppObject(
  ctl: Controller,
  applyView: ApplyView,
  isMenuOpenImmediate: () => boolean,
  service?: SearchService
): AppObject {
  const actor = createActor(createAsyncSearchMachine(service));
  return appObjectActor(ctl, actor, sources, applyView, { isMenuOpenImmediate });
}

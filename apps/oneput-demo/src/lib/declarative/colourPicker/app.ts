import type { Controller } from '@oneput/oneput';
import { createActor } from 'xstate';
import { appObjectActor, type ApplyView } from '../appObjectActor.js';
import { colourForm, colourPicker } from './machine.js';
import { formSources, pickerSources } from './sources.js';

/** Make a fresh child for each call to app.run. Back uses the stack pop. */
function createColourPicker(ctl: Controller, apply: ApplyView) {
  const actor = createActor(colourPicker);
  actor.on('picked', ({ payload }) => ctl.app.exit(payload));
  return appObjectActor(ctl, actor, pickerSources, apply);
}

/** Show how a parent machine receives the result of a child AppObject. */
export function createColourForm(ctl: Controller, apply: ApplyView) {
  const actor = createActor(colourForm);
  actor.on('openPicker', () => ctl.app.run(createColourPicker(ctl, apply)));
  actor.on('invalidResult', ({ message }) => ctl.notify(message));
  return appObjectActor(ctl, actor, formSources, apply);
}

import { err, ok, type Result } from 'neverthrow';
import { emit, enqueueActions, setup } from 'xstate';
import type { ViewDef } from '../interpreter.js';
import type { OneputEvent } from '../oneputEvents.js';
import {
  isColour,
  type Colour,
  type FormContext,
  type formSources,
  type pickerSources
} from './sources.js';

type ColourResult = { colour: Colour };
type Picked = { type: 'picked'; payload: ColourResult };
type FormOutput = { type: 'openPicker' } | { type: 'invalidResult'; message: string };
type PickerView = ViewDef<never, keyof typeof pickerSources.lists>;
type OpenPicker = { type: 'PICK_COLOUR' };
type FormView = ViewDef<keyof typeof formSources.text, never, never, never, OpenPicker>;

/** Check the child payload before storing it in the parent context. */
function readColourResult(payload: unknown): Result<ColourResult, 'Invalid colour result'> {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'colour' in payload &&
    isColour(payload.colour)
  ) {
    return ok({ colour: payload.colour });
  }
  return err('Invalid colour result');
}

export const picker = setup({
  types: {
    events: {} as OneputEvent,
    emitted: {} as Picked,
    meta: {} as { view?: PickerView }
  },
  guards: {
    isOfferedColour: ({ event }) => event.type === 'ITEM_ACTIVATED' && isColour(event.id)
  },
  actions: {
    returnColour: enqueueActions(({ event, enqueue }) => {
      if (event.type === 'ITEM_ACTIVATED' && isColour(event.id)) {
        enqueue.emit({ type: 'picked', payload: { colour: event.id } });
      }
    })
  }
});

export const form = setup({
  types: {
    context: {} as FormContext,
    events: {} as OneputEvent | OpenPicker,
    emitted: {} as FormOutput,
    meta: {} as { view?: FormView }
  },
  actions: {
    openPicker: emit({ type: 'openPicker' }),
    readResult: enqueueActions(({ event, enqueue }) => {
      if (event.type !== 'RESUMED' || event.result === undefined) return;
      const result = readColourResult(event.result);
      if (result.isOk()) enqueue.assign({ colour: result.value.colour });
      else enqueue.emit({ type: 'invalidResult', message: result.error });
    })
  }
});

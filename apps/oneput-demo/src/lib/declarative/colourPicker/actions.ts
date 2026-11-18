import { err, ok, type Result } from 'neverthrow';
import { emit, setup } from 'xstate';
import type { ViewDef } from '../interpreter.js';
import { isColour, type Colour, type PickColour, type lists } from './sources.js';

export type ColourResult = { colour: Colour };
type Picked = { type: 'picked'; payload: ColourResult };
type PickerView = ViewDef<never, never, PickColour, never, never, keyof typeof lists>;

/** Check the unknown payload before delivering it to the parent machine. */
export function readColourResult(payload: unknown): Result<ColourResult, 'Invalid colour result'> {
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

/** XState implementations for the names in the picker machine. */
export const picker = setup({
  types: {
    events: {} as PickColour,
    emitted: {} as Picked,
    meta: {} as { view?: PickerView }
  },
  guards: {
    isOfferedColour: ({ event }) => isColour(event.colour)
  },
  actions: {
    returnColour: emit(({ event }) => ({ type: 'picked', payload: { colour: event.colour } }))
  }
});

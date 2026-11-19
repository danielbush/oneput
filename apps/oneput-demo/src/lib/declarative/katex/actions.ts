import { assertEvent, assign, emit, setup } from 'xstate';
import { formulaMarkup, type DemoDocument } from '../../main/FormulaMarkup.js';
import type { ViewDef } from '../interpreter.js';
import type { OneputEvent } from '@oneput/oneput/shared/declarative/oneputEvents.js';
import { canInsert, sources, type FormulaContext } from './sources.js';

type RowEvent = { type: 'INSERT_FORMULA'; focusInput?: true } | { type: 'TOGGLE_DISPLAY_MODE' };
type FormulaView = ViewDef<
  keyof typeof sources.text,
  never,
  never,
  keyof typeof sources.enabled,
  RowEvent,
  keyof typeof sources.html
>;
type HostEvent =
  | { type: 'startInput' }
  | { type: 'stopInput' }
  | { type: 'focusInput' }
  | { type: 'blurInput' }
  | { type: 'inserted'; focusInput: boolean };

/** Compile once per change. Keep the last accepted preview when compilation fails. */
export function formulaEditor(doc: DemoDocument) {
  return setup({
    types: {
      context: {} as FormulaContext,
      events: {} as OneputEvent | RowEvent,
      emitted: {} as HostEvent,
      meta: {} as { view?: FormulaView }
    },
    guards: {
      canInsert: ({ context }) => canInsert(context),
      hasError: ({ context }) => context.error !== null,
      keyboardFocusedPreview: ({ event }) =>
        event.type === 'ITEM_FOCUSED' &&
        event.cause === 'keyboard' &&
        event.id === 'katex-preview-pane',
      keyboardFocusedRow: ({ event }) => event.type === 'ITEM_FOCUSED' && event.cause === 'keyboard'
    },
    actions: {
      startInput: emit({ type: 'startInput' }),
      stopInput: emit({ type: 'stopInput' }),
      focusInput: emit({ type: 'focusInput' }),
      blurInput: emit({ type: 'blurInput' }),
      writeSource: assign(({ event }) => {
        assertEvent(event, 'INPUT_CHANGED');
        return { source: event.value };
      }),
      toggleDisplayMode: assign({ displayMode: ({ context }) => !context.displayMode }),
      compileFormula: assign(({ context }) => {
        const result = formulaMarkup(context.source, context.displayMode, doc);
        return result.isOk()
          ? { preview: result.value, error: null }
          : { error: result.error.message };
      }),
      insertFormula: ({ context }) => {
        if (context.preview !== null) doc.append(context.preview, context.displayMode);
      },
      clearFormula: assign({ source: '', preview: null, error: null }),
      reportInsertion: emit(({ event }) => {
        assertEvent(event, 'INSERT_FORMULA');
        return { type: 'inserted', focusInput: event.focusInput === true };
      })
    }
  });
}

import { describe, it, expect, afterEach } from 'vitest';
import { Controller } from './controller.js';
import type { InputSelectionState } from '../types.js';

/**
 * happy-dom only dispatches a single `selectionchange` per session, not one
 * per `setSelectionRange` like real browsers. We model the missing
 * infrastructure behavior in tests: every selection mutation is paired
 * with an explicit document-level `selectionchange` dispatch, the same
 * signal a real browser would emit.
 */
function setRange(input: HTMLInputElement, start: number, end: number) {
  input.setSelectionRange(start, end);
  document.dispatchEvent(new Event('selectionchange'));
}

/**
 * Sets up a Controller with a nulled InputController whose input element is
 * mounted in document.body so it can receive focus. Returns the controller,
 * the input element, and a tracker that records every selection state
 * emitted.
 */
function setup() {
  const ctl = Controller.createNull();
  const input = ctl.currentProps.inputElement as HTMLInputElement;
  document.body.appendChild(input);
  input.focus();

  const emitted: InputSelectionState[] = [];
  const unsubscribe = ctl.input.subscribeSelectionChange((selection) => {
    emitted.push(selection);
  });

  return { ctl, input, emitted, unsubscribe };
}

describe('InputController selection-change emission', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('emits when the discrete selection state changes', () => {
    it('emits SELECT_ALL when the whole input is selected', async () => {
      // arrange
      const { ctl, input, emitted } = setup();
      await ctl.input.setInputValue('hello');

      // act
      setRange(input, 0, 5);

      // assert
      expect(emitted).toContain('SELECT_ALL');
    });

    it('emits CURSOR_AT_END when the caret is at the end', async () => {
      // arrange
      const { ctl, input, emitted } = setup();
      await ctl.input.setInputValue('hello');
      setRange(input, 0, 5); // SELECT_ALL first
      emitted.length = 0;

      // act
      setRange(input, 5, 5);

      // assert
      expect(emitted).toEqual(['CURSOR_AT_END']);
    });

    it('emits CURSOR_AT_BEGINNING when the caret is at the start', async () => {
      // arrange
      const { ctl, input, emitted } = setup();
      await ctl.input.setInputValue('hello');
      setRange(input, 0, 5);
      emitted.length = 0;

      // act
      setRange(input, 0, 0);

      // assert
      expect(emitted).toEqual(['CURSOR_AT_BEGINNING']);
    });

    it('emits CURSOR_AT_MIDDLE when the caret is mid-text', async () => {
      // arrange
      const { ctl, input, emitted } = setup();
      await ctl.input.setInputValue('hello');
      setRange(input, 0, 5);
      emitted.length = 0;

      // act
      setRange(input, 2, 2);

      // assert
      expect(emitted).toEqual(['CURSOR_AT_MIDDLE']);
    });

    it('emits SELECT_PARTIAL for a sub-range', async () => {
      // arrange
      const { ctl, input, emitted } = setup();
      await ctl.input.setInputValue('hello');

      // act
      setRange(input, 1, 3);

      // assert
      expect(emitted).toEqual(['SELECT_PARTIAL']);
    });

    it('emits EMPTY when the input has no value', async () => {
      // arrange
      const { ctl, input, emitted } = setup();

      // act
      setRange(input, 0, 0);

      // assert
      expect(emitted).toEqual(['EMPTY']);
    });
  });

  describe('dedupe', () => {
    it('does not emit again when the discrete state is unchanged', async () => {
      // arrange
      const { ctl, input, emitted } = setup();
      await ctl.input.setInputValue('hello');
      setRange(input, 5, 5); // CURSOR_AT_END
      emitted.length = 0;

      // act — moving the cursor to a different mid-text position keeps it CURSOR_AT_MIDDLE,
      // and a redundant move to the same position emits nothing
      setRange(input, 2, 2); // CURSOR_AT_MIDDLE — first time
      setRange(input, 2, 2); // CURSOR_AT_MIDDLE — same state, deduped

      // assert
      expect(emitted).toEqual(['CURSOR_AT_MIDDLE']);
    });
  });

  describe('filter by activeElement', () => {
    it('does not emit when the input is not focused', async () => {
      // arrange
      const { ctl, input, emitted } = setup();
      await ctl.input.setInputValue('hello');
      input.blur();
      emitted.length = 0;

      // act — selection mutation while not focused
      setRange(input, 0, 5);

      // assert
      expect(emitted).toEqual([]);
    });
  });

  describe('cleanup on element swap', () => {
    it('stops listening on the previous element and resets dedupe', async () => {
      // arrange
      const { ctl, input, emitted } = setup();
      await ctl.input.setInputValue('hello');
      setRange(input, 5, 5); // CURSOR_AT_END
      emitted.length = 0;

      // swap to a new input
      const replacement = document.createElement('input');
      document.body.appendChild(replacement);
      replacement.value = 'world';
      replacement.focus();
      ctl.input.handleInputElementChange(replacement);

      // act — a mutation on the old element no longer reaches subscribers
      setRange(input, 0, 5);
      // and the first event on the new element re-emits even though the
      // discrete state matches what the previous element ended on
      setRange(replacement, 5, 5);

      // assert
      expect(emitted).toEqual(['CURSOR_AT_END']);
    });
  });
});

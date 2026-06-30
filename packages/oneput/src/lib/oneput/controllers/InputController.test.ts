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

  describe('element swap', () => {
    it('rebinds the selection listener to the new element', async () => {
      // arrange
      const { ctl, input, emitted } = setup();
      await ctl.input.setInputValue('hello');
      setRange(input, 5, 5); // CURSOR_AT_END on the original element

      // swap to a new input
      const replacement = document.createElement('input');
      document.body.appendChild(replacement);
      replacement.value = 'world';
      replacement.focus();
      ctl.input.handleInputElementChange(replacement);
      emitted.length = 0;

      // act — a selection on the new element is observed
      setRange(replacement, 5, 5); // CURSOR_AT_END on the replacement

      // assert — exactly one emit (the old listener was removed, not doubled up)
      expect(emitted).toEqual(['CURSOR_AT_END']);
    });
  });
});

import { DynamicPlaceholderBase } from '../types.js';
import type { InputSelectionState } from '../types.js';
import type { Controller } from './controller.js';
import { tick } from 'svelte';
import { SelectionToggler } from './helpers/SelectionToggler.js';
import type { InputChangeEvent, InputChangePayload } from './InternalEventEmitter.js';

export class InputController {
  public static create(ctl: Controller) {
    return new InputController(ctl);
  }

  /**
   * Assumes we have happy-dom set up in the testing environment.
   */
  public static createNull(ctl: Controller) {
    const controller = new InputController(ctl);
    const inputElement = document.createElement('input');
    controller.handleInputElementChange(inputElement);
    ctl.currentProps.inputElement = inputElement;
    ctl.currentProps.inputValue = '';
    return controller;
  }

  constructor(private ctl: Controller) {
    this.ctl.currentProps.onInputChange = (evt) => {
      const target = evt.target as HTMLInputElement | null;
      const value = target?.value ?? '';
      const range: [number | null, number | null] = [
        target?.selectionStart ?? null,
        target?.selectionEnd ?? null
      ];
      const previousValue = this.beforeInputSnapshot?.value ?? this.lastInputValue;
      const previousRange = this.beforeInputSnapshot?.range ?? this.lastInputRange;
      // Emit internal event for decoupled communication
      const payload: InputChangeEvent = {
        type: 'input-change',
        payload: {
          evt: evt as InputEvent,
          value,
          previousValue,
          range,
          previousRange,
          priorValue: this.previousUserInputValue,
          priorRange: this.previousUserInputRange,
          cause: 'user'
        }
      };
      this.ctl.events.emit(payload);
      this.previousUserInputValue = previousValue;
      this.previousUserInputRange = previousRange;
      this.lastInputValue = value;
      this.lastInputRange = range;
      this.beforeInputSnapshot = undefined;
    };
  }

  triggerInputEvent() {
    // If you call setInputValue(...) and then trigger, the value in
    // setInputValue may not get applied.
    setTimeout(() => {
      this.inputElement?.dispatchEvent(new Event('input', { bubbles: true }));
    }, 0);
  }

  private defaultPlaceholder?: string | DynamicPlaceholderBase;
  private inputElement?: HTMLInputElement;
  private selectionToggler?: SelectionToggler;
  /**
   * The most recent input value the controller knows about, regardless of
   * source.
   */
  private lastInputValue = '';
  private lastInputRange: [number | null, number | null] = [0, 0];
  /**
   * The input value from the previous user-originated input-change.
   */
  private previousUserInputValue?: string;
  private previousUserInputRange?: [number | null, number | null];
  /**
   * A temporary snapshot captured from the DOM right before a real browser
   * input event mutates the element.
   *
   * "real browser event" = basically means "an input lifecycle event coming
   * from actual input interaction semantics," usually user-driven.  Excludes
   * programmatic changes.
   */
  private beforeInputSnapshot?: {
    value: string;
    range: [number | null, number | null];
  };
  private removeBeforeInputListener?: () => void;

  /**
   * Used by Oneput to tell the controller what the input element is.
   */
  handleInputElementChange(inputElement: HTMLInputElement | undefined) {
    this.removeBeforeInputListener?.();
    this.inputElement = inputElement;
    this.selectionToggler = new SelectionToggler(this.ctl);
    if (!inputElement) {
      return;
    }
    const handleBeforeInput = () => {
      this.beforeInputSnapshot = {
        value: inputElement.value,
        range: [inputElement.selectionStart ?? null, inputElement.selectionEnd ?? null]
      };
    };
    // 'beforeinput' lets us capture the real pre-edit state from the DOM,
    // instead of trying to reconstruct it later.
    inputElement.addEventListener('beforeinput', handleBeforeInput);
    this.removeBeforeInputListener = () => {
      inputElement.removeEventListener('beforeinput', handleBeforeInput);
    };
    this.lastInputValue = inputElement.value;
    this.lastInputRange = [inputElement.selectionStart ?? 0, inputElement.selectionEnd ?? 0];
  }

  focusInput = () => {
    // Edge case: we set multiline from 1 to n > 1; the input element
    // changes to textarea.  We call focus synchronously after this change.
    // It's very possible the inputElement will still be pointing to the old
    // input element.
    //
    // TODO: I think we could use svelte tick() here?
    setTimeout(() => {
      this.inputElement?.focus();
    }, 0);
  };

  /**
   * TODO: replace focusInput with this.
   */
  focus = this.focusInput;

  /**
   * Allows you to set the value in the input programmatically.  Typing by the user will also update it.
   */
  setInputValue(val?: string) {
    this.ctl.currentProps.inputValue = val?.trim() || '';
    if (this.inputElement) {
      this.inputElement.value = this.ctl.currentProps.inputValue;
    }
    this.lastInputValue = this.ctl.currentProps.inputValue;
    const range = this.getRange();
    this.lastInputRange = range;
    return tick();
  }

  selectAll = () => {
    this.inputElement?.setSelectionRange(0, this.inputElement.value.length);
  };

  subscribeInputChange = (handleInputChange: (payload: InputChangePayload) => void) => {
    const unsubscribeInputChanges = this.ctl.events.on('input-change', (payload) =>
      handleInputChange(payload)
    );
    return unsubscribeInputChanges;
  };

  subscribeSelectionChange = (handleSelectionChange: (selection: InputSelectionState) => void) => {
    const unsubscribeSelectionChanges = this.ctl.events.on('selection-change', ({ selection }) =>
      handleSelectionChange(selection)
    );
    return unsubscribeSelectionChanges;
  };

  /**
   * Determine the type of selection in the input.
   */
  getSelectionState(): InputSelectionState {
    const len = this.ctl.currentProps.inputValue?.length ?? 0;
    const start = this.inputElement?.selectionStart ?? 0;
    const stop = this.inputElement?.selectionEnd ?? 0;
    if (len === 0) {
      return 'EMPTY';
    }
    if (start === stop) {
      if (start === 0) {
        return 'CURSOR_AT_BEGINNING';
      }
      if (start === len) {
        return 'CURSOR_AT_END';
      }
      return 'CURSOR_AT_MIDDLE';
    }
    if (start === 0 && stop === len) {
      return 'SELECT_ALL';
    }
    return 'SELECT_PARTIAL';
  }

  toggleSelect = () => {
    this.selectionToggler?.toggle();
    this.focus();
    this.ctl.events.emit({
      type: 'selection-change',
      payload: { selection: this.getSelectionState() }
    });
  };

  getRange: () => [number | null, number | null] = () => {
    const start = this.inputElement?.selectionStart ?? null;
    const stop = this.inputElement?.selectionEnd ?? null;
    return [start, stop];
  };

  moveCursorToBeginning = () => {
    this.inputElement?.setSelectionRange(0, 0);
    this.lastInputRange = [0, 0];
  };

  moveCursorToEnd = () => {
    const len = this.inputElement?.value.length;
    if (len) {
      this.inputElement?.setSelectionRange(len, len);
      this.lastInputRange = [len, len];
    }
  };

  setDefaultPlaceholder(msg?: string | DynamicPlaceholderBase, apply = false) {
    this.defaultPlaceholder = msg;
    if (apply) {
      this.resetPlaceholder();
    }
  }

  getDefaultPlaceholder() {
    return this.defaultPlaceholder || '';
  }

  /**
   * Get the current placeholder.
   *
   * If default or current placeholder is a Placeholder instance, it will
   * return the last value set by this instance.
   */
  getPlaceholder() {
    return this.ctl.currentProps.placeholder || '';
  }

  private placeholderObject?: DynamicPlaceholderBase;
  private _setPlaceholder = (msg?: string) => {
    this.ctl.currentProps.placeholder = msg || '';
  };

  /**
   * - setPlaceholder('') => empty placeholder
   * - setPlaceholder()   => default placeholder
   */
  setPlaceholder(msg?: string | DynamicPlaceholderBase) {
    if (this.placeholderObject) {
      this.placeholderObject.disable();
      this.placeholderObject = undefined;
    }
    if (msg instanceof DynamicPlaceholderBase) {
      this.placeholderObject = msg;
      this.placeholderObject.enable(this._setPlaceholder);
      return;
    }
    if (msg || msg === '') {
      this._setPlaceholder(msg);
      return;
    }
    if (this.defaultPlaceholder instanceof DynamicPlaceholderBase) {
      this.placeholderObject = this.defaultPlaceholder;
      this.placeholderObject.enable(this._setPlaceholder);
      return;
    }
    this._setPlaceholder(this.defaultPlaceholder);
  }

  refreshPlaceholder() {
    if (this.placeholderObject) {
      this.placeholderObject.enable(this._setPlaceholder);
    }
  }

  resetPlaceholder() {
    this.setPlaceholder(this.getDefaultPlaceholder());
  }

  getInputValue() {
    return this.ctl.currentProps.inputValue || '';
  }

  /**
   * Prefer ctl.ui.update({ flags: { enableInputElement: true } }) instead.
   */
  _enableInputElement(on: boolean = true) {
    if (!this.inputElement) {
      return;
    }
    this.inputElement.disabled = !on;
  }

  /**
   * Enable or disable the input.
   *
   * This may be exposed as part of a set of input-related operations eg jsed as
   * a UserInput interface.
   */
  enable(bool: boolean) {
    this.ctl.ui.update({ flags: { enableInputElement: bool } });
  }

  private submitHandler?: (input: string) => void;
  private submitOnce?: typeof this.submitHandler;

  setSubmitHandler(fn: (input: string) => void) {
    this.submitHandler = fn;
    this.submitOnce = undefined;
  }

  setSubmitHandlerOnce(fn: (input: string) => void) {
    this.submitHandler = fn;
    this.submitOnce = fn;
  }

  runSubmitHandler() {
    const currHandler = this.submitHandler;
    this.submitHandler?.(this.getInputValue());
    // If setSubmitHandlerOnce or setSubmitHandler are called within the
    // current submit handler invocation above we will end up unsetting
    // them!
    //
    // To avoid this:
    // Store the reference to the original handler in currHandler then we
    // can use submitOnce to check:
    // (1) we are doing "submit once" logic
    // (2) the submit handler has not changed
    //
    if (currHandler && this.submitOnce === currHandler) {
      this.submitHandler = undefined;
      this.submitOnce = undefined;
    }
  }

  resetSubmitHandler() {
    this.submitHandler = undefined;
    this.submitOnce = undefined;
  }

  /**
   * Emit the same selection-change signal that production input code relies on.
   *
   * This does not change the selection by itself. Tests must first update the
   * element's selection state, then dispatch so subscribers observe it through
   * the normal selection-change path.
   */
  private dispatchSelectionChange() {
    this.ctl.events.emit({
      type: 'selection-change',
      payload: { selection: this.getSelectionState() }
    });
  }

  /**
   * Emit the same input event that production input code subscribes to.
   *
   * This does not simulate typing by itself. Tests must first update `.value`
   * (and usually selection), then dispatch so subscribers are notified through
   * the normal input subscription path.
   */
  private dispatchInput() {
    const target = this.inputElement;
    if (!target) return;
    this.ctl.currentProps.inputValue = target.value;
    const range: [number | null, number | null] = [
      target.selectionStart ?? null,
      target.selectionEnd ?? null
    ];
    const payload: InputChangeEvent = {
      type: 'input-change',
      payload: {
        evt: new InputEvent('input'),
        value: target.value,
        previousValue: this.lastInputValue,
        previousRange: this.lastInputRange,
        range,
        priorValue: this.previousUserInputValue,
        priorRange: this.previousUserInputRange,
        cause: 'user'
      }
    };
    this.ctl.events.emit(payload);
    this.previousUserInputValue = this.lastInputValue;
    this.previousUserInputRange = this.lastInputRange;
    this.lastInputValue = target.value;
    this.lastInputRange = range;
  }

  /**
   * Move the caret and emit selection-change so tests drive the same
   * CURSOR_STATE path as production input selection updates.
   */
  async setCaret(index: number) {
    this.inputElement?.setSelectionRange(index, index);
    this.lastInputRange = [index, index];
    this.dispatchSelectionChange();
  }

  /**
   * Select a range and emit selection-change so subscribers observe the update
   * through the normal input controller event path.
   */
  async selectRange(start: number, end: number) {
    this.inputElement?.setSelectionRange(start, end);
    this.lastInputRange = [start, end];
    this.dispatchSelectionChange();
  }

  /**
   * Replace the current selection with text, move the caret to the end of the
   * inserted text, and emit the selection/input events that EditManager
   * subscribes to. Mutating `.value` alone would skip that path.
   */
  async typeText(text: string) {
    const input = this.inputElement;
    if (!input) return;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    const next = start + text.length;
    input.setSelectionRange(next, next);
    this.dispatchSelectionChange();
    this.dispatchInput();
  }
}

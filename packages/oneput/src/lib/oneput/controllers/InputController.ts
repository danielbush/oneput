import { DynamicPlaceholderBase } from '../types.js';
import type { InputSelectionState } from '../types.js';
import type { Controller } from './controller.js';
import { tick } from 'svelte';
import { SelectionToggler } from './helpers/SelectionToggler.js';

export class InputController {
  public static create(ctl: Controller) {
    return new InputController(ctl);
  }

  constructor(private ctl: Controller) {
    this.ctl.currentProps.onInputChange = (evt) => {
      // Emit internal event for decoupled communication
      this.ctl.events.emit({
        type: 'input-change',
        payload: { evt: evt as InputEvent, value: (evt.target as HTMLInputElement)?.value ?? '' }
      });
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
   * Used by Oneput to tell the controller what the input element is.
   */
  handleInputElementChange(inputElement: HTMLInputElement | undefined) {
    this.inputElement = inputElement;
    this.selectionToggler = new SelectionToggler(this.ctl);
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
    return tick();
  }

  selectAll = () => {
    this.inputElement?.setSelectionRange(0, this.inputElement.value.length);
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
    this.ctl.events.emit({
      type: 'toggle-select',
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
  };

  moveCursorToEnd = () => {
    const len = this.inputElement?.value.length;
    if (len) {
      this.inputElement?.setSelectionRange(len, len);
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
}

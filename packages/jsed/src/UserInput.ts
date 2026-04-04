export type UserInput = {
  setInputValue: (value: string) => Promise<void>;
  selectAll: () => void;
  moveCursorToBeginning: () => void;
  moveCursorToEnd: () => void;
  getRange: () => [number | null, number | null];
  focus: () => void;
  enable: (bool: boolean) => void;
  setPlaceholder: (value: string) => void;
  resetPlaceholder: () => void;
};

export type NullUserInputEvent =
  | { type: 'set-input-value'; value: string }
  | { type: 'select-all' }
  | { type: 'move-cursor-to-beginning' }
  | { type: 'move-cursor-to-end' }
  | { type: 'focus' }
  | { type: 'enable'; enabled: boolean }
  | { type: 'set-placeholder'; value: string }
  | { type: 'reset-placeholder' };

/**
 * Nullable USER_INPUT that records observable writes and lets tests control the
 * current selection range.
 */
export class NullUserInput implements UserInput {
  static createNull(params?: { range?: [number | null, number | null] }) {
    return new NullUserInput(params?.range ?? [0, 0]);
  }

  #inputValue = '';
  #range: [number | null, number | null];
  #enabled = true;
  #placeholder = '';
  #events: NullUserInputEvent[] = [];

  constructor(range: [number | null, number | null] = [0, 0]) {
    this.#range = range;
  }

  async setInputValue(value: string): Promise<void> {
    this.#inputValue = value;
    this.#events.push({ type: 'set-input-value', value });
  }

  selectAll(): void {
    this.#events.push({ type: 'select-all' });
  }

  moveCursorToBeginning(): void {
    this.#events.push({ type: 'move-cursor-to-beginning' });
  }

  moveCursorToEnd(): void {
    this.#events.push({ type: 'move-cursor-to-end' });
  }

  getRange(): [number | null, number | null] {
    return this.#range;
  }

  focus(): void {
    this.#events.push({ type: 'focus' });
  }

  enable(enabled: boolean): void {
    this.#enabled = enabled;
    this.#events.push({ type: 'enable', enabled });
  }

  setPlaceholder(value: string): void {
    this.#placeholder = value;
    this.#events.push({ type: 'set-placeholder', value });
  }

  resetPlaceholder(): void {
    this.#placeholder = '';
    this.#events.push({ type: 'reset-placeholder' });
  }

  setRange(range: [number | null, number | null]) {
    this.#range = range;
  }

  getInputValue() {
    return this.#inputValue;
  }

  isEnabled() {
    return this.#enabled;
  }

  getPlaceholder() {
    return this.#placeholder;
  }

  trackEvents() {
    return { data: this.#events };
  }
}

export type UserInputSelectionState =
  | 'SELECT_ALL'
  | 'SELECT_PARTIAL'
  | 'CURSOR_AT_BEGINNING'
  | 'CURSOR_AT_MIDDLE'
  | 'CURSOR_AT_END'
  | 'EMPTY';

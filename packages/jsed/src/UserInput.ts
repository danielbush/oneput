export type UserInputSelectionState =
  | 'SELECT_ALL'
  | 'SELECT_PARTIAL'
  | 'CURSOR_AT_BEGINNING'
  | 'CURSOR_AT_MIDDLE'
  | 'CURSOR_AT_END'
  | 'EMPTY';

export type UserInput = {
  setInputValue: (value: string) => Promise<void>;
  selectAll: () => void;
  moveCursorToBeginning: () => void;
  moveCursorToEnd: () => void;
  /**
   * Move the caret to a specific position and notify selection subscribers.
   *
   * Intended mainly for nulled/test input implementations that need to mimic
   * the real selection-change path.
   */
  setCaret: (index: number) => Promise<void>;
  /**
   * Select a range and notify selection subscribers.
   *
   * Intended mainly for nulled/test input implementations that need to mimic
   * the real selection-change path.
   */
  selectRange: (start: number, end: number) => Promise<void>;
  /**
   * Replace the current selection with text and notify input/selection
   * subscribers as if the user had typed into the input.
   *
   * Intended mainly for nulled/test input implementations.
   */
  typeText: (text: string) => Promise<void>;
  getRange: () => [number | null, number | null];
  focus: () => void;
  enable: (bool: boolean) => void;
  setPlaceholder: (value: string) => void;
  resetPlaceholder: () => void;
  /**
   * Subscribe to user input changes.
   *
   * This lets you react to the user typing into the input.
   */
  subscribeInputChange: (handleInputChange: (value: string) => void) => () => void;
  /**
   * Subscribe to user selection changes.
   *
   * This lets you react to the user changing the selection in the input.
   */
  subscribeSelectionChange: (
    handleSelectionChange: (selection: UserInputSelectionState) => void
  ) => () => void;
};

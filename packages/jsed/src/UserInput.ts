export type UserInputSelectionState =
  | 'SELECT_ALL'
  | 'SELECT_PARTIAL'
  | 'CURSOR_AT_BEGINNING'
  | 'CURSOR_AT_MIDDLE'
  | 'CURSOR_AT_END'
  | 'EMPTY';

export type UserInputRange = [number | null, number | null];

export type UserInputChangeCause = 'user' | 'programmatic';

export type UserInputChange = {
  /** Input value after this change. */
  value: string;
  /** Input value immediately before this change (one step back). */
  previousValue: string;
  /** Selection range after this change. */
  range: UserInputRange;
  /** Selection range immediately before this change (one step back). */
  previousRange: UserInputRange;
  /**
   * Input value two steps back — the state before `previousValue`. Optional;
   * only populated when a meaningful two-step history exists. Disambiguates
   * multi-step flows like prepend-then-space vs. split-in-the-middle.
   */
  priorValue?: string;
  /** Selection range two steps back — paired with `priorValue`. */
  priorRange?: UserInputRange;
  cause: UserInputChangeCause;
};

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
  subscribeInputChange: (handleInputChange: (change: UserInputChange) => void) => () => void;
  /**
   * Subscribe to user selection changes.
   *
   * This lets you react to the user changing the selection in the input.
   */
  subscribeSelectionChange: (
    handleSelectionChange: (selection: UserInputSelectionState) => void
  ) => () => void;
};

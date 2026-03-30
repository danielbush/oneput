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

export type UserInputSelectionState =
  | 'SELECT_ALL'
  | 'SELECT_PARTIAL'
  | 'CURSOR_AT_BEGINNING'
  | 'CURSOR_AT_MIDDLE'
  | 'CURSOR_AT_END'
  | 'EMPTY';

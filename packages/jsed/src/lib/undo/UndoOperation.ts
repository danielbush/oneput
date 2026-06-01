import type { DeleteElement } from '../ops/focusable';
import type { InsertTokenAfter, RemoveTokenAll, ReplaceText } from '../ops/token';

export type UndoOperation =
  | RemoveTokenAll
  | DeleteElement
  | PlaceCursor
  | ReplaceText
  | InsertTokenAfter;

export type PlaceCursor = {
  action: 'place-cursor';
  target: HTMLElement;
};

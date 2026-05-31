import type { DeleteElement } from '../ops/focusable';
import type { RemoveTokenAll } from '../ops/token';

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

export type ReplaceText = {
  action: 'replace-text';
  token: HTMLElement;
  before: string;
  after: string;
};

export type InsertTokenAfter = {
  action: 'insert-token-after';
  token: HTMLElement;
  after: HTMLElement;
  separatorAfter: InsertSeparatorAfter | null;
};

export type InsertSeparatorAfter = {
  action: 'insert-separator-after';
  separator: Text;
  after: HTMLElement;
};

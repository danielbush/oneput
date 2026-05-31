export type UndoOperation =
  | RemoveTokenAll
  | DeleteElement
  | PlaceCursor
  | ReplaceText
  | InsertTokenAfter;

export type RemoveTokenAll = RemoveToken | AnchorizeToken;

export type RemoveToken = {
  action: 'delete-token';
  token: HTMLElement;
  removeNextSeparator: false | HTMLElement;
  removePreviousSeparator: false | HTMLElement;
};

export type AnchorizeToken = {
  action: 'anchorize-token';
  deletedToken: RemoveToken;
  anchor: HTMLElement;
};

export type DeleteElement = {
  action: 'delete-element';
  marker: HTMLElement;
  deleted: HTMLElement;
};

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

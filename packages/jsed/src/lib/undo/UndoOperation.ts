export type UndoOperation = DeleteToken | DeleteElement;

export type DeleteToken = {
  action: 'delete-token';
  token: HTMLElement;
  removeNextSeparator: false | HTMLElement;
  removePreviousSeparator: false | HTMLElement;
};

export type DeleteElement = {
  action: 'delete-element';
  marker: HTMLElement;
  deleted: HTMLElement;
};

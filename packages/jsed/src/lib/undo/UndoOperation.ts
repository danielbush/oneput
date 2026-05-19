export type UndoOperation = DeleteToken | DeleteElement;

export type DeleteToken = {
  action: 'delete-token';
  token: HTMLElement;
  removeNextSeparator: false | Text;
  removePreviousSeparator: false | Text;
};

export type DeleteElement = {
  action: 'delete-element';
  marker: HTMLElement;
  deleted: Element;
};

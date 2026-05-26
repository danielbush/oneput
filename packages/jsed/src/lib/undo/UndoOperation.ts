export type UndoOperation = DeleteTokenAll | DeleteElement;

export type DeleteTokenAll = DeleteToken | AnchorizeToken;

export type DeleteToken = {
  action: 'delete-token';
  token: HTMLElement;
  removeNextSeparator: false | HTMLElement;
  removePreviousSeparator: false | HTMLElement;
};

export type AnchorizeToken = {
  action: 'anchorize-token';
  deletedToken: DeleteToken;
  anchor: HTMLElement;
};

export type DeleteElement = {
  action: 'delete-element';
  marker: HTMLElement;
  deleted: HTMLElement;
};

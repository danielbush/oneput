import type { AppObject, Controller } from '@oneput/oneput';
import { type JsedDocument, type IJsedCursor, utils } from '@oneput/jsed';

/**
 * Oneput AppObject that manages an edit session for a single document.
 */
export class EditDocument implements AppObject {
  static create(ctl: Controller, params: { document: JsedDocument }) {
    return new EditDocument(ctl, params.document);
  }

  private cursor?: IJsedCursor;

  constructor(
    private ctl: Controller,
    private document: JsedDocument
  ) {}

  public onStart = () => {
    this.document
      .requestCursorUnderFocus({
        onTokenChange: this.handleTokenChange
      })
      .map((cursor) => {
        this.cursor = cursor;
      })
      .mapErr((err) => {
        switch (err.type) {
          case 'no-token-under-focus':
            this.ctl.notify('No token under focus', { duration: 3000 });
            this.ctl.app.exit();
            break;
          case 'no-focus':
            this.ctl.notify('No document focus found', { duration: 3000 });
            this.ctl.app.exit();
            break;
        }
      });
  };

  public onExit = () => {};

  /**
   * When the cursor changes its token because of some action it has been
   * commanded to do (eg due to delete operation).
   *
   * USER_CALL / USER_ACT
   */
  private handleTokenChange = async (token: HTMLElement) => {
    this.ctl.input.setInputValue(utils.token.getValue(token)).then(() => {
      this.ctl.input.selectAll();
    });
  };
}

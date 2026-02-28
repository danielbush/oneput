import type { AppObject, Controller } from '@oneput/oneput';
import { icons } from '../icons.js';
import { type IJsedCursor, type JsedDocument } from '@oneput/jsed';
import { setDocument } from './_bindings.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { EditDocument } from './EditDocument.js';
// import { EditDocument } from './EditDocument.js';

/**
 * Oneput AppObject that manages a single JsedDocument.
 */
export class ViewDocument implements AppObject {
  static create(ctl: Controller, params: { document: JsedDocument }) {
    return new ViewDocument(ctl, params.document);
  }

  constructor(
    private ctl: Controller,
    private document: JsedDocument
  ) {}

  onStart = () => {
    setDocument(this.document);
  };

  onExit = () => {
    //
  };

  actions = {
    EDIT_FIRST: () =>
      this.document
        .requestCursorUnderFocus({
          onTokenChange: () => {}
        })
        .map((cursor) => {
          this.ctl.app.run(
            EditDocument.create(this.ctl, {
              cursor: cursor
            })
          );
        })
        .mapErr((err) => {
          switch (err.type) {
            case 'no-token-under-focus':
              this.ctl.notify('No token under focus', { duration: 3000 });
              break;
            case 'no-focus':
              this.ctl.notify('No document focus found', { duration: 3000 });
              break;
          }
        })
  };

  menu = {
    id: 'root',
    items: [
      stdMenuItem({
        id: 'EDIT_FIRST',
        textContent: 'Edit...',
        action: this.actions.EDIT_FIRST,
        left: (b) => [b.icon(icons.Pencil)]
      })
    ]
  };
}

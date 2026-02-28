import type { AppObject, Controller } from '@oneput/oneput';
import { icons } from '../icons.js';
import * as jsed from '@oneput/jsed';
import { setDocument } from './_bindings.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { EditDocument } from './EditDocument.js';

/**
 * Oneput AppObject that manages a single JsedDocument.
 */
export class ViewDocument implements AppObject {
  static create(ctl: Controller, params: { document: jsed.JsedDocument }) {
    return new ViewDocument(ctl, params.document);
  }

  constructor(
    private ctl: Controller,
    private document: jsed.JsedDocument
  ) {}

  onStart = () => {
    setDocument(this.document);
  };

  onExit = () => {
    //
  };

  actions = {
    EDIT_FIRST: () => {
      this.ctl.app.run(
        EditDocument.create(this.ctl, {
          document: this.document
        })
      );
    }
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

import type { Controller, AppObject } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { Layout, type LayoutSettings } from './_layout.js';
import { JsedDocument, JsedEditDocumentUI } from '@oneput/jsed';
import { icons } from '@oneput/jsed';

export class Root implements AppObject {
  static create(ctl: Controller) {
    return new Root(ctl, {
      JsedDocument: (root) => JsedDocument.create(root),
      JsedEditDocumentUI: ({ document }: { document: JsedDocument }) =>
        JsedEditDocumentUI.create(ctl, {
          document,
          hooks: {
            onActivate: () => {
              ctl.ui.update<LayoutSettings>({ params: { menuTitle: 'Editing' } });
            }
          }
        })
    });
  }

  constructor(
    private ctl: Controller,
    private create: {
      JsedDocument: (root: HTMLElement) => JsedDocument;
      JsedEditDocumentUI: (params: { document: JsedDocument }) => JsedEditDocumentUI;
    }
  ) {}

  layout = {
    layout: Layout.create,
    params: { menuTitle: 'Root' }
  };

  onStart = () => {
    // Edit straight away...
    this.actions.EDIT.action();
  };

  actions = {
    EDIT: {
      action: () => {
        const docRoot = document.querySelector('#test-doc') as HTMLElement;
        this.ctl.app.run(
          this.create.JsedEditDocumentUI({
            document: this.create.JsedDocument(docRoot)
          })
        );
        this.ctl.menu.closeMenu();
      }
    }
  };

  menu = () => ({
    id: 'root',
    items: [
      stdMenuItem({
        id: 'load-doc',
        textContent: 'Start editing...',
        action: this.actions.EDIT.action,
        left: (b) => [b.icon(icons.File)]
      })
    ]
  });
}

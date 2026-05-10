import type { Controller, AppObject } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { Layout, type LayoutSettings } from './_layout.js';
import { JsedDocument } from '@oneput/jsed';
import { icons } from '@oneput/jsed/ui/oneput/app';
import { EditDocumentUI } from './EditDocumentUI.js';

export class Root implements AppObject {
  static create(ctl: Controller) {
    return new Root(ctl, {
      Layout: () => Layout.create(ctl),
      JsedDocument: (root) => JsedDocument.create(root),
      EditDocumentUI: ({ document }: { document: JsedDocument }) =>
        EditDocumentUI.create(ctl, { document })
    });
  }

  constructor(
    private ctl: Controller,
    private create: {
      Layout: () => Layout;
      JsedDocument: (root: HTMLElement) => JsedDocument;
      EditDocumentUI: (params: { document: JsedDocument }) => EditDocumentUI;
    }
  ) {
    this.ctl.ui.setLayout(this.create.Layout());
  }

  onStart = () => {
    this.ctl.ui.update<LayoutSettings>({ params: { menuTitle: 'Root' } });
  };

  menu = () => ({
    id: 'root',
    items: [
      stdMenuItem({
        id: 'load-doc',
        textContent: 'Start editing...',
        action: async () => {
          const docRoot = document.querySelector('#test-doc') as HTMLElement;
          this.ctl.app.run(
            this.create.EditDocumentUI({
              document: this.create.JsedDocument(docRoot)
            })
          );
          this.ctl.menu.closeMenu();
        },
        left: (b) => [b.icon(icons.File)]
      })
    ]
  });
}

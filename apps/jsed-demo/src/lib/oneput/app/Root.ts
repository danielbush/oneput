import { JsedDocument } from '@oneput/jsed';
import type { AppObject, Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from './_icons.js';
import { Layout, type LayoutSettings } from './_layout.js';
import { TestDocService } from '$lib/jsed/services/TestDocService.js';
import { EditDocument } from './EditDocument.js';

export class Root implements AppObject {
  static create(ctl: Controller) {
    return new Root(ctl, {
      Layout: () => Layout.create(ctl),
      TestDocService: () => TestDocService.create(),
      JsedDocument: (root) => JsedDocument.create(root),
      EditDocument: (params) => EditDocument.create(ctl, params)
    });
  }

  constructor(
    private ctl: Controller,
    private create: {
      Layout: () => Layout;
      TestDocService: () => TestDocService;
      JsedDocument: (root: HTMLElement) => JsedDocument;
      EditDocument: (params: { document: JsedDocument }) => EditDocument;
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
            this.create.EditDocument({
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

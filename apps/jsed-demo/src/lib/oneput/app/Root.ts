import { JsedDocument } from '@oneput/jsed';
import type { AppObject, Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from './_icons.js';
import { Layout, type LayoutSettings } from './_layout.js';
import { TestDocService } from '$lib/jsed/services/TestDocService.js';
import { ViewDocument } from './ViewDocument.js';

export class Root implements AppObject {
  static create(ctl: Controller) {
    return new Root(ctl, {
      Layout: () => Layout.create(ctl),
      TestDocService: () => TestDocService.create(),
      JsedDocument: (root) => JsedDocument.create(root),
      ViewDocument: (params) => ViewDocument.create(ctl, params)
    });
  }

  constructor(
    private ctl: Controller,
    private create: {
      Layout: () => Layout;
      TestDocService: () => TestDocService;
      JsedDocument: (root: HTMLElement) => JsedDocument;
      ViewDocument: (params: { document: JsedDocument }) => ViewDocument;
    }
  ) {
    this.ctl.ui.setLayout(this.create.Layout());
  }

  onStart = () => {
    this.ctl.ui.update<LayoutSettings>({ params: { menuTitle: 'Root' } });
  };

  actions = {
    LOAD_TEST_DOC: {
      action: async () => {
        this.create
          .TestDocService()
          .loadTestDoc()
          .map((docRoot) => {
            this.ctl.app.run(
              this.create.ViewDocument({
                document: this.create.JsedDocument(docRoot)
              })
            );
            this.ctl.menu.closeMenu();
          })
          .mapErr((error) => {
            switch (error.type) {
              case 'missing-element':
                this.ctl.notify(`Element #${error.id} not found`);
                break;
              case 'http':
                this.ctl.notify(`Failed to load doc: ${error.status} ${error.statusText}`);
                break;
              case 'network':
                this.ctl.notify('Network error loading doc');
                console.error(error.cause);
                break;
            }
          });
      }
    }
  };

  menu = {
    id: 'root',
    items: [
      stdMenuItem({
        id: 'load-doc',
        textContent: 'Load test doc...',
        action: this.actions.LOAD_TEST_DOC.action,
        left: (b) => [b.icon(icons.File)]
      })
    ]
  };
}

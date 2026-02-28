import * as jsed from '@oneput/jsed';
import type { AppObject, Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { icons } from '../icons.js';
import { Layout, type LayoutSettings } from './_layout.js';
import { TestDocService } from '$lib/jsed/services/TestDocService.js';
import { ViewDocument } from './ViewDocument.js';

export class Root implements AppObject {
  static create(ctl: Controller) {
    ctl.ui.setLayout(Layout.create(ctl));
    return new Root(ctl, {
      TestDocService: () => TestDocService.create(),
      JsedDocument: (root: HTMLElement) => jsed.JsedDocument.create(root)
    });
  }

  constructor(
    private ctl: Controller,
    private create: {
      TestDocService: () => TestDocService;
      JsedDocument: (root: HTMLElement) => jsed.JsedDocument;
    }
  ) {}

  onStart() {
    this.ctl.ui.update<LayoutSettings>({ params: { menuTitle: 'Root' } });
    this.ctl.menu.setMenu({
      id: 'root',
      items: [
        stdMenuItem({
          id: 'load-doc',
          textContent: 'Load test doc...',
          action: this.actions.LOAD_TEST_DOC,
          left: (b) => [b.icon(icons.File)]
        })
      ]
    });
  }

  actions = {
    LOAD_TEST_DOC: async () => {
      this.create
        .TestDocService()
        .loadTestDoc()
        .map((docRoot) => {
          this.ctl.app.run(
            ViewDocument.create(this.ctl, {
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
  };
}

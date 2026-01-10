import type { AppObject, Controller } from '$oneput';
import { stdMenuItem } from '$shared/ui/menuItems/stdMenuItem.js';
import { icons } from '../icons.js';
import type { LayoutSettings } from './_layout.js';
import { start, type JsedDocument } from '../../jsed/index.js';
import { app } from '../jsed.js';

export class Root implements AppObject {
  static create(ctl: Controller) {
    return new Root(ctl);
  }

  constructor(private ctl: Controller) {}

  onStart() {
    this.ctl.ui.update<LayoutSettings>({ params: { menuTitle: 'Root' } });
    this.ctl.menu.setMenuItems({
      id: 'root',
      items: [
        stdMenuItem({
          id: 'load-doc',
          textContent: 'Load test doc...',
          action: async () => {
            const docRoot = document.getElementById('load-doc');
            if (!docRoot) {
              this.ctl.notify('Could not load test doc!');
              return;
            }

            try {
              const response = await fetch('/api/docs/test_doc');
              if (!response.ok) {
                this.ctl.notify('Failed to load test doc!');
                return;
              }
              const html = await response.text();
              docRoot.innerHTML = html;

              const doc = start(docRoot);
              app.setDocument(doc);

              doc.nav.FOCUS(doc.root);

              console.log('Type "doc" in the console to access the current jsed document instance');
              // TODO: improve ts
              (globalThis as typeof globalThis & { doc: JsedDocument }).doc = doc;

              this.ctl.menu.closeMenu();
            } catch (err) {
              this.ctl.notify('Error loading test doc!');
              console.error(err);
            }
          },
          left: (b) => [b.icon(icons.File)]
        })
      ]
    });
  }
}

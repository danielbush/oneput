import type { AppObject, Controller } from '$oneput';
import { stdMenuItem } from '$shared/ui/menuItems/stdMenuItem.js';
import { icons } from '../icons.js';
import type { LayoutSettings } from './_layout.js';
import { start, type JsedDocument } from '../../jsed/index.js';

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
							console.log('Access "doc" in the console');
							// TODO: improve ts
							(globalThis as typeof globalThis & { doc: JsedDocument }).doc = doc;
							console.log(doc);
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

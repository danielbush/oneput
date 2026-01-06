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
					action: () => {
						const docRoot = document.getElementById('load-doc');
						if (!docRoot) {
							this.ctl.notify('Could not load test doc!');
							return;
						}
						const doc = start(docRoot);
						console.log('Access "doc" in the console');
						// TODO: improve ts
						(globalThis as typeof globalThis & { doc: JsedDocument }).doc = doc;
						console.log(doc);
					},
					left: (b) => [b.icon(icons.File)]
				})
			]
		});
	}
}

import type { AppObject, Controller } from '$oneput';
import type { LayoutSettings } from './_layout.js';

export class Root implements AppObject {
	static create(ctl: Controller) {
		return new Root(ctl);
	}
	constructor(private ctl: Controller) {}
	onStart() {
		this.ctl.ui.update<LayoutSettings>({ params: { menuTitle: 'Root' } });
	}
}

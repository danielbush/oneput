import type { Controller } from '$lib/oneput/controller.js';
import { stdMenuItem } from '$lib/oneput/stdMenuItem.js';
import type { MyDefaultUIValues } from '../../config/ui.js';

export class TomatoTimer {
	static create(ctl: Controller, back: () => void) {
		return new TomatoTimer(ctl, back);
	}

	private exit = () => {
		this.back();
	};

	constructor(
		private ctl: Controller,
		private back: () => void
	) {}

	runUI() {
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Tomato Timer',
			exitAction: this.exit
		});
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'pomodoro-start',
				textContent: 'Start',
				action: () => {
					console.log('start');
				}
			})
		]);
	}
}

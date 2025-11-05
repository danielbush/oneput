import type { Controller } from '$lib/oneput/controller.js';
import { stdMenuItem } from '$lib/oneput/stdMenuItem.js';
import type { MyDefaultUIValues } from '../../config/ui.js';

export class Pomodoro {
	static create(ctl: Controller, back: () => void) {
		return new Pomodoro(ctl, back);
	}

	private exit = () => {
		this.back();
	};

	constructor(
		private ctl: Controller,
		private back: () => void
	) {}

	runUI() {
		console.log('start pomodoro app');
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Pomodoro',
			exitAction: this.exit
		});
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'pomodoro-start',
				textContent: 'Start',
				tag: 'button',
				attr: {
					type: 'button',
					onclick: () => {
						console.log('start');
					}
				}
				// action: () => {
				// 	console.log('start');
				// }
			})
		]);
	}
}

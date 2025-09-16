import type { Controller } from '$lib/oneput/controller.js';
import { menuItemWithIcon } from '$lib/ui.js';
import { TestService } from './TestService.js';

export class AsyncSearchExample {
	static create(c: Controller, back: () => void) {
		return new AsyncSearchExample(c, back);
	}

	private testService = new TestService();

	constructor(
		private ctl: Controller,
		private back: () => void
	) {
		this.ctl.setBackBinding(this.exit);
		this.ctl.menu.setMenuItemsFnAsync(async (input) => {
			try {
				const results = await this.testService.fetchData(input);
				return results.map((result) => {
					return menuItemWithIcon({
						id: result,
						text: result
					});
				});
			} catch (error) {
				console.error(error);
				return [
					// TODO: use an alert?
					menuItemWithIcon({
						id: 'error',
						text: 'Error'
					})
				];
			}
		});
		this.ctl.input.setInputValue();
		this.ctl.ui.setPlaceholder('Start typing...');
		this.ctl.menu.setMenuItems([
			menuItemWithIcon({
				id: 'initial',
				text: 'Waiting...'
			})
		]);
		this.ctl.input.focusInput();
	}

	private exit = () => {
		this.ctl.input.setInputValue();
		this.back();
	};
}

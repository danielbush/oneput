import type { Controller } from '$lib/oneput/controller.js';
import { menuItemWithIcon } from '../../config/ui.js';
import { TestInputService } from '../../service/TestInputService.js';

export class AsyncSearchExample {
	static create(c: Controller, back: () => void) {
		const testService = TestInputService.create();
		return new AsyncSearchExample(c, back, testService);
	}

	constructor(
		private ctl: Controller,
		private back: () => void,
		private testService: TestInputService
	) {}

	run() {
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
		this.ctl.ui.setPlaceholder('Start typing something...');
		this.ctl.menu.setMenuItems([
			menuItemWithIcon({
				id: 'initial',
				text: 'Start typing something...'
			})
		]);
		this.ctl.input.focusInput();
	}

	private exit = () => {
		this.ctl.input.setInputValue();
		this.back();
	};
}

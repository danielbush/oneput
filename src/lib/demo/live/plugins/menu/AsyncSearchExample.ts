import type { Controller } from '$lib/oneput/controller.js';
import { randomId } from '$lib/oneput/lib.js';
import { refreshCwIcon } from '$lib/oneput/shared/icons.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../../config/ui.js';
import { TestInputService } from '../../service/TestInputService.js';

export class AsyncSearchExample {
	static create(ctl: Controller, back: () => void) {
		const testInputService = TestInputService.create();
		return new AsyncSearchExample(ctl, back, testInputService);
	}

	constructor(
		private ctl: Controller,
		private back: () => void,
		private testInputService: TestInputService,
		private unsetMenuItemsFn?: () => void
	) {}

	run() {
		this.ctl.ui.applyDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Async Search Example',
			exitAction: this.exit
		});
		this.unsetMenuItemsFn = this.ctl.menu.setMenuItemsFnAsync(
			async (input) => {
				try {
					const results = await this.testInputService.fetchData(input);
					return results.map((result) => {
						return menuItemWithIcon({
							id: randomId(),
							text: result
						});
					});
				} catch (error) {
					console.error(error);
					const message =
						error instanceof Error
							? error.message
							: typeof error === 'string'
								? error
								: 'Unknown error';
					this.ctl.notify(`Error fetching data: ${message}`, { duration: 10000 });
					return;
				}
			},
			{
				onDebounce: (isDebouncing) => {
					this.setBusy(isDebouncing);
				},
				focusBehaviour: 'last'
			}
		);
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

	private setBusy(busy: boolean) {
		if (busy) {
			this.ctl.ui.setInputUI((current) => ({
				...current,
				right: {
					id: 'input-right-1',
					type: 'hflex',
					children: [
						{
							id: 'input-right-1-child',
							classes: ['oneput__icon', 'oneput__rotate'],
							type: 'fchild',
							innerHTMLUnsafe: refreshCwIcon
						}
					]
				}
			}));
		} else {
			this.ctl.ui.setInputUI((current) => ({
				...current,
				right: undefined
			}));
		}
	}

	private exit = () => {
		this.ctl.input.setInputValue();
		this.unsetMenuItemsFn?.();
		this.back();
	};
}

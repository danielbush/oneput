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
		private unsetMenuItemsFn?: () => void,
		private notify?: ReturnType<Controller['notify']>
	) {}

	runUI() {
		this.ctl.ui.runUI<MyDefaultUIValues>({
			menuHeader: 'Async Search Example',
			exitAction: this.exit
		});
		this.notify = this.ctl.notify(
			'Start typing something and inspect the browser console.  ' +
				'Items are delayed but only latest items should show when debounce times out.  ' +
				'The service will randomly fail 10% of the time.'
		);
		this.unsetMenuItemsFn = this.ctl.menu.setMenuItemsFnAsync(
			async (input) => {
				try {
					this.notify?.updateMessage('Fetching data...');
					const results = await this.testInputService.fetchData(input);
					return results.map((result) => {
						return menuItemWithIcon({
							id: randomId(),
							text: result
						});
					});
				} catch (error) {
					this.ctl.alert({
						message: 'An error!',
						additional: 'This is probably a simulated error.  Check the browser console...'
					});
					this.setError();
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
					if (this.isError && !isDebouncing) {
						return;
					}
					this.notify?.updateMessage(isDebouncing ? 'Debouncing...' : 'Ready...');
					this.setBusy(isDebouncing);
				},
				focusBehaviour: 'last'
			}
		);
		this.ctl.input.setInputValue();
		this.ctl.ui.setPlaceholder('Start typing something...');
		this.ctl.menu.setMenuItems([]);
		this.ctl.input.focusInput();
	}

	private isError = false;
	private setError() {
		this.notify?.updateMessage('Try hitting the refresh button to re-run the last input...');
		this.isError = true;
		this.ctl.ui.setInputUI((current) => ({
			...current,
			right: {
				id: 'input-right-1',
				type: 'hflex',
				children: [
					{
						id: 'input-right-1-child',
						tag: 'button',
						attr: {
							title: 'Error',
							onclick: () => {
								console.log('TODO: refresh');
							}
						},
						classes: ['oneput__icon-button'],
						type: 'fchild',
						innerHTMLUnsafe: refreshCwIcon
					}
				]
			}
		}));
	}

	private setBusy(busy: boolean) {
		this.isError = false;
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

import type { Controller } from '$lib/oneput/controller.js';
import { randomId } from '$lib/oneput/lib.js';
import { refreshCwIcon } from '$lib/oneput/shared/icons.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../config/defaultUI.js';
import { TestInputService } from '../service/TestInputService.js';

export class AsyncSearchExample {
	static create(ctl: Controller) {
		const testInputService = TestInputService.create();
		return new AsyncSearchExample(ctl, testInputService);
	}

	constructor(
		private ctl: Controller,
		private testInputService: TestInputService,
		private unsetMenuItemsFn?: () => void,
		private notify?: ReturnType<Controller['notify']>
	) {}

	runUI() {
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Async Search Example',
			exitAction: this.ctl.goBack
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
					this.setError(error as Error);
					return;
				}
			},
			{
				onDebounce: (isDebouncing) => {
					if (this.isError && !isDebouncing) {
						return;
					} else {
						this.notify?.updateMessage(isDebouncing ? 'Debouncing...' : 'Ready...');
						this.setBusy(isDebouncing);
					}
				},
				focusBehaviour: 'last'
			}
		);
		this.ctl.input.setInputValue();
		this.ctl.input.setPlaceholder('Start typing something...');
		this.ctl.menu.setMenuItems([]);
		this.ctl.input.focusInput();
	}

	private isError = false;
	private setError(error: Error) {
		console.error(error);
		this.isError = true;
		this.notify?.updateMessage('An error!  Check the browser console...');
		const alert = this.ctl.alert({
			message: 'An error!',
			additional:
				'This is a simulated error.  Check the browser console...  Try hitting the refresh icon in the input area to re-run your last input.  Or you can hit ok here and not re-run the input.  Here was the error:' +
				error
		});
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
								alert.cancel();
								this.ctl.menu.triggerMenuItemsFn();
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

	beforeExit = () => {
		this.ctl.input.setInputValue();
		this.notify?.clear();
		this.unsetMenuItemsFn?.();
	};
}

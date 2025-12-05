import { hflex } from '$lib/oneput/lib/builder.js';
import type { Controller } from '$lib/oneput/controller.js';
import { refreshCwIcon } from '$lib/oneput/shared/icons.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/stdMenuItem.js';
import { type LayoutSettings } from '../layout.js';
import { TestInputService } from '../service/TestInputService.js';

export class AsyncSearchExample {
	static create(ctl: Controller) {
		const testInputService = TestInputService.create();
		return new AsyncSearchExample(ctl, testInputService);
	}

	constructor(
		private ctl: Controller,
		private testInputService: TestInputService,
		private notify?: ReturnType<Controller['notify']>
	) {}

	runUI() {
		this.ctl.ui.runLayout<LayoutSettings>({
			menuHeader: 'Async Search Example'
		});
		this.notify = this.ctl.notify(
			'Start typing something and inspect the browser console.  ' +
				'Items are delayed but only latest items should show when debounce times out.  ' +
				'The service will randomly fail 10% of the time.'
		);
		this.ctl.menu.setMenuItemsFnAsync(
			async (input) => {
				try {
					this.ctl.notify('Fetching data...');
					const results = await this.testInputService.fetchData(input);
					return results.map((result) => {
						return stdMenuItem({
							id: `async-search-example-${result}`,
							textContent: `Result for input: '${result}'`,
							action: () => {
								this.ctl.notify(`Selected: ${result}`);
							}
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
						this.ctl.notify(isDebouncing ? 'Debouncing...' : 'Ready...');
						this.setBusy(isDebouncing);
					}
				},
				focusBehaviour: 'last'
			}
		);
		this.ctl.input.setPlaceholder('Start typing something...');
		this.ctl.menu.setMenuItems([]);
		this.ctl.input.focusInput();
	}

	private isError = false;
	private setError(error: Error) {
		console.error(error);
		this.isError = true;
		const alert = this.ctl.alert({
			message: 'An error!',
			additional:
				'This is a simulated error.  Check the browser console...  Try hitting the refresh icon in the input area to re-run your last input.  Or you can hit ok here and not re-run the input.  Here was the error:' +
				error
		});
		this.ctl.ui.setInputUI((current) => ({
			...current,
			right: hflex({
				id: 'input-right-1',
				children: (b) => [
					b.iconButton({
						title: 'Error',
						innerHTMLUnsafe: refreshCwIcon,
						attr: {
							onclick: () => {
								alert.cancel();
								this.ctl.menu.triggerMenuItemsFn();
							}
						}
					})
				]
			})
		}));
	}

	private setBusy(busy: boolean) {
		this.isError = false;
		if (busy) {
			this.ctl.ui.setInputUI((current) => ({
				...current,
				right: hflex({
					id: 'input-right-1',
					children: (b) => [b.icon({ innerHTMLUnsafe: refreshCwIcon, classes: ['oneput__rotate'] })]
				})
			}));
		} else {
			this.ctl.ui.setInputUI((current) => ({
				...current,
				right: undefined
			}));
		}
	}

	beforeExit = () => {
		// TODO: make this a beforeRunUI ?
		this.notify?.clear();
	};
}

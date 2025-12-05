import { hflex, menuItem } from '$lib/oneput/lib/builder.js';
import type { Controller } from '$lib/oneput/controller.js';
import { infoIcon, refreshCwIcon } from '$lib/oneput/shared/icons.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/stdMenuItem.js';
import { type LayoutSettings } from '../layout.js';
import { TestInputService } from '../service/TestInputService.js';

class OuterRightStatus {
	static create = () => {
		const status = new OuterRightStatus();
		return status;
	};

	onMount = (node: HTMLElement) => {
		this.node = node;
		return () => {
			this.destroy();
		};
	};

	private node?: HTMLElement;

	constructor() {}

	update = (msg: string) => {
		if (this.node) {
			this.node.innerHTML = msg;
		}
	};

	destroy = () => {};
}

export class AsyncSearchExample {
	static create(ctl: Controller) {
		const testInputService = TestInputService.create();
		const outerRightStatus = OuterRightStatus.create();
		return new AsyncSearchExample(ctl, testInputService, outerRightStatus);
	}

	constructor(
		private ctl: Controller,
		private testInputService: TestInputService,
		private outerRightStatus: OuterRightStatus
	) {}

	runUI() {
		this.ctl.ui.runLayout<LayoutSettings>({
			menuHeader: 'Async Search Example',
			outerRight: (b) =>
				b.fchild({
					onMount: this.outerRightStatus.onMount
				})
		});
		this.ctl.menu.setMenuItemsFnAsync(
			async (input) => {
				try {
					this.outerRightStatus.update('Fetching data...');
					const results = await this.testInputService.fetchData(input);
					return results.map((result) => {
						this.ctl.clearNotifications();
						return stdMenuItem({
							id: result.id,
							textContent: `Result: '${result.text}'`,
							action: () => {
								this.outerRightStatus.update(`Selected: ${result}`);
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
						this.outerRightStatus.update(isDebouncing ? 'Debouncing...' : 'Ready');
						this.setBusy(isDebouncing);
					}
				},
				focusBehaviour: 'last'
			}
		);
		this.ctl.input.setPlaceholder('Start typing something...');
		this.ctl.menu.setMenuItems([
			menuItem({
				id: 'instructions',
				ignored: true,
				style: {
					color: '#777'
				},
				children: (b) => [
					b.icon({
						innerHTMLUnsafe: infoIcon
					}),
					b.fchild({
						textContent:
							'Start typing something and inspect the browser console.  ' +
							'Items are delayed but only latest items should show when debounce times out.  ' +
							'The service will randomly fail 10% of the time.'
					}),
					b.spacer()
				]
			})
		]);
		this.ctl.input.focusInput();
	}

	private isError = false;
	private setError(error: Error) {
		console.error(error);
		this.outerRightStatus.update('⚠️ Error');
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
		this.ctl.clearNotifications();
	};
}

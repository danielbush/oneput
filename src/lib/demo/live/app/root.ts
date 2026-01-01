import type { Controller } from '$lib/oneput/controller.js';
import {
	commandIcon,
	searchIcon,
	sigmaIcon,
	timerIcon,
	tocIcon
} from '$lib/oneput/shared/icons.js';
import { SettingsUI } from './settings.js';
import { AsyncSearchExample } from './AsyncSearchExample.js';
import { NavigateHeadings } from './NavigateHeadings.js';
import { KatexDemo } from './KatexDemo.js';
import { TomatoTimer } from './tomatoTimer/TomatoTimer.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/menuItems/stdMenuItem.js';
import type { LayoutSettings } from '../layout.js';

export class RootUI {
	static create(ctl: Controller) {
		const createSettingsUI = () => {
			return SettingsUI.create(ctl);
		};
		const createNavigateHeadings = () => {
			return NavigateHeadings.create(ctl);
		};
		const createTomatoTimer = () => {
			return TomatoTimer.create(ctl);
		};
		const createKatexDemo = () => {
			return KatexDemo.create(ctl);
		};
		const createAsyncSearchExample = () => {
			return AsyncSearchExample.create(ctl);
		};
		return new RootUI(
			ctl,
			createSettingsUI,
			createNavigateHeadings,
			createTomatoTimer,
			createKatexDemo,
			createAsyncSearchExample
		);
	}

	constructor(
		private ctl: Controller,
		private createSettingsUI: () => SettingsUI,
		private createNavigateHeadings: () => NavigateHeadings,
		private createTomatoTimer: () => TomatoTimer,
		private createKatexDemo: () => KatexDemo,
		private createAsyncSearchExample: () => AsyncSearchExample
	) {}

	onStart = () => {
		this.run();
	};

	run = () => {
		this.ctl.ui.update<LayoutSettings>({
			params: {
				menuTitle: 'Home'
			},
			flags: {
				enableGoBack: false
			}
		});
		const blankItems = [...Array(10)].map((_, i) => {
			return stdMenuItem({
				id: `blank-item-${i}`,
				textContent: `Blank item ${i}`,
				action: () => {}
			});
		});
		this.ctl.menu.setMenuItems({
			id: 'main',
			items: [
				stdMenuItem({
					id: 'settings',
					left: (b) => [b.icon({ icon: 'settings' })],
					textContent: 'Settings...',
					action: () => {
						this.ctl.app.run(this.createSettingsUI());
					},
					right: (b) => [b.icon({ icon: 'chevronRight' })]
				}),
				stdMenuItem({
					id: 'navigate-outline',
					left: (b) => [b.icon({ innerHTMLUnsafe: tocIcon })],
					textContent: 'Navigate outline...',
					action: () => {
						this.ctl.app.run(this.createNavigateHeadings());
					}
				}),
				stdMenuItem({
					id: 'tomato-timer',
					left: (b) => [b.icon({ innerHTMLUnsafe: timerIcon })],
					textContent: 'Tomato timer...',
					action: () => {
						this.ctl.app.run(this.createTomatoTimer());
					},
					bottom: {
						textContent: 'A Pomodoro-like timer to demo timer widgets and state management...'
					}
				}),
				stdMenuItem({
					id: 'insert-katex',
					left: (b) => [b.icon({ innerHTMLUnsafe: sigmaIcon })],
					textContent: 'Insert katex...',
					action: () => {
						this.ctl.app.run(this.createKatexDemo());
					}
				}),
				stdMenuItem({
					id: 'hide-oneput',
					left: (b) => [b.icon({ innerHTMLUnsafe: commandIcon })],
					textContent: 'Hide',
					action: () => {
						this.ctl.toggleHide();
					}
				}),
				stdMenuItem({
					id: 'async-search',
					left: (b) => [b.icon({ innerHTMLUnsafe: searchIcon })],
					textContent: 'Async menu items demo...',
					action: () => {
						this.ctl.app.run(this.createAsyncSearchExample());
					}
				}),
				stdMenuItem({
					id: 'inline-notification-permanent',
					textContent: 'Show permanent inline notification',
					action: () => {
						this.ctl.notify('This is a permanent inline notification');
					}
				}),
				stdMenuItem({
					id: 'transient-inline-notification',
					textContent: 'Show transient inline notification',
					action: () => {
						this.ctl.notify('This is a transient inline notification', { duration: 3000 });
					}
				}),
				stdMenuItem({
					id: 'alert',
					textContent: 'Show alert',
					action: async () => {
						console.log('before alert...');
						const alert = this.ctl.alert({
							message: 'Main message',
							additional: 'This is some additional info'
						});
						await alert.userClicksOk();
						console.log('after alert...');
					}
				}),
				stdMenuItem({
					id: 'confirm',
					textContent: 'Confirm',
					action: async () => {
						console.log('before confirm...');
						const confirm = this.ctl.confirm({
							message: 'Main message',
							additional: 'This is some additional info'
						});
						const yes = await confirm.userChooses();
						console.log('after confirm...', yes);
					}
				}),
				stdMenuItem({
					id: 'test-notification-api',
					textContent: 'Test Notification API...',
					action: () => {
						this.ctl.notify(
							'You may need to (1) use https; (2) allow notifications for your browser in your OS; (3) allow notifications in the browser for this origin.'
						);
						if (!('Notification' in window)) {
							// Check if the browser supports notifications
							this.ctl.alert({
								message: 'Not Supported',
								additional: 'Notification API is not supported in this browser.'
							});
						} else if (Notification.permission === 'granted') {
							// Check whether notification permissions have already been granted;
							// if so, create a notification
							new Notification('Hi there!');
							// …
						} else if (Notification.permission !== 'denied') {
							// We need to ask the user for permission
							Notification.requestPermission().then((permission) => {
								// If the user accepts, let's create a notification
								if (permission === 'granted') {
									new Notification('Hi there!');
								}
							});
						}
					}
				}),
				stdMenuItem({
					id: 'blank-html-item',
					htmlContentUnsafe: '<p>Html <b>item</b></p>',
					action: () => {}
				}),
				...blankItems
			]
		});
	};
}

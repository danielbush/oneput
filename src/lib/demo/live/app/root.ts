import type { Controller } from '$lib/oneput/controller.js';
import { randomId } from '$lib/oneput/lib.js';
import {
	searchIcon,
	settingsIcon,
	sigmaIcon,
	timerIcon,
	tocIcon
} from '$lib/oneput/shared/icons.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../config/ui.js';
import { SettingsUI } from './settings.js';
import { AsyncSearchExample } from '../plugins/AsyncSearchExample.js';
import { NavigateHeadings } from '../plugins/menu/NavigateHeadings.js';
import { KatexDemo } from '../plugins/menu/KatexDemo.js';
import { TomatoTimer } from '../plugins/menu/TomatoTimer.js';
import { stdMenuItem } from '$lib/oneput/shared/stdMenuItem.js';

export class RootUI {
	static create(ctl: Controller) {
		return new RootUI(ctl);
	}

	constructor(private ctl: Controller) {}

	runUI = () => {
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Home',
			exitType: 'exit',
			placeholder: 'This is root...'
		});
		let blankItemCounter = 0;
		this.ctl.menu.setMenuItems([
			menuItemWithIcon({
				id: 'settings',
				leftIcon: settingsIcon,
				text: 'Settings...',
				action: () => {
					SettingsUI.create(this.ctl, this.runUI).runUI();
				}
			}),
			menuItemWithIcon({
				id: 'navigate-outline',
				leftIcon: tocIcon,
				text: 'Navigate outline...',
				action: () => {
					NavigateHeadings.create(this.ctl, document, this.runUI).runUI();
				}
			}),
			stdMenuItem({
				id: 'tomato-timer',
				left: (b) => [b.icon({ innerHTMLUnsafe: timerIcon })],
				textContent: 'Tomato timer...',
				action: () => {
					TomatoTimer.create(this.ctl, this.runUI).runUI();
				},
				bottom: {
					textContent: 'A Pomodoro-like timer to demo timer widgets and state management...'
				}
			}),
			menuItemWithIcon({
				id: 'insert-katex',
				leftIcon: sigmaIcon,
				text: 'Insert katex...',
				action: () => {
					KatexDemo.create(this.ctl, this.runUI).runUI();
				}
			}),
			menuItemWithIcon({
				id: 'hide-oneput',
				// leftIcon: commandIcon,
				text: 'Hide',
				action: () => {
					this.ctl.toggleHide();
				}
			}),
			menuItemWithIcon({
				id: 'async-search',
				text: 'Async menu items demo...',
				leftIcon: searchIcon,
				action: () => {
					AsyncSearchExample.create(this.ctl, this.runUI).runUI();
				}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: 'Show permanent inline notification',
				action: () => {
					this.ctl.notify('This is a permanent inline notification');
				}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: 'Show transient inline notification',
				action: () => {
					this.ctl.notify('This is a transient inline notification', { duration: 3000 });
				}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: 'Show alert',
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
			menuItemWithIcon({
				id: randomId(),
				text: 'Confirm',
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
			menuItemWithIcon({
				id: randomId(),
				text: 'Test Notification API...',
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
			{
				id: randomId(),
				type: 'hflex',
				tag: 'button',
				children: [
					{
						id: randomId(),
						type: 'fchild',
						classes: ['oneput__icon']
					},
					{
						id: randomId(),
						type: 'fchild',
						htmlContentUnsafe: '<p>Html blank item</p>'
					},
					{
						id: randomId(),
						type: 'fchild'
					}
				]
			},
			menuItemWithIcon({
				id: randomId(),
				text: `Blank item ${++blankItemCounter}`,
				action: () => {}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `Blank item ${++blankItemCounter}`,
				action: () => {}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `Blank item ${++blankItemCounter}`,
				action: () => {}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `Blank item ${++blankItemCounter}`,
				action: () => {}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `Blank item ${++blankItemCounter}`,
				action: () => {}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `Blank item ${++blankItemCounter}`,
				action: () => {}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `Blank item ${++blankItemCounter}`,
				action: () => {}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: `Blank item ${++blankItemCounter}`,
				action: () => {}
			})
		]);
	};
}

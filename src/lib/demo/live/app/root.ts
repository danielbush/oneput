import type { Controller } from '$lib/oneput/controller.js';
import { searchIcon, settingsIcon, sigmaIcon, tocIcon } from '$lib/oneput/shared/icons.js';
import { AsyncSearchExample } from '../plugins/menu/AsyncSearchExample.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../config/ui.js';
import { NavigateHeadings } from '../plugins/menu/NavigateHeadings.js';
import { SettingsUI } from './settings.js';
import { randomId } from '$lib/oneput/lib.js';

export class RootUI {
	static create(ctl: Controller) {
		return new RootUI(ctl);
	}

	constructor(private ctl: Controller) {}

	run = () => {
		this.ctl.setBackBinding(() => {
			this.ctl.menu.closeMenu();
		});
		this.ctl.ui.applyDefaultUI<MyDefaultUIValues>({
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
					SettingsUI.create(this.ctl, this.run).run();
				}
			}),
			menuItemWithIcon({
				id: 'navigate-outline',
				leftIcon: tocIcon,
				text: 'Navigate outline...',
				action: () => {
					NavigateHeadings.create(this.ctl, document, this.run).run();
				}
			}),
			menuItemWithIcon({
				id: 'insert-katex',
				leftIcon: sigmaIcon,
				text: 'Insert katex...',
				action: () => {
					console.log('insert katex');
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
					AsyncSearchExample.create(this.ctl, this.run).run();
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
					await this.ctl.alert({
						message: 'Main message',
						additional: 'This is some additional info'
					});
					console.log('after alert...');
				}
			}),
			menuItemWithIcon({
				id: randomId(),
				text: 'Confirm',
				action: async () => {
					console.log('before confirm...');
					const yes = await this.ctl.confirm({
						message: 'Main message',
						additional: 'This is some additional info'
					});
					console.log('after confirm...', yes);
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
						classes: ['oneput__menu-item-body'],
						innerHTMLUnsafe: '<p>Html blank item</p>'
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

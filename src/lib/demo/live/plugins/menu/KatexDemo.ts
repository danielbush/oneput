import type { Controller } from '$lib/oneput/controller.js';
import katex from 'katex';
import { menuItemWithIcon, type MyDefaultUIValues } from '../../config/ui.js';
import { randomId } from '$lib/oneput/lib.js';
import { settingsIcon } from '$lib/oneput/shared/icons.js';

export class KatexDemo {
	static create(ctl: Controller, back: () => void) {
		return new KatexDemo(ctl, back);
	}

	private ctl: Controller;
	private back: () => void;

	constructor(ctl: Controller, back: () => void) {
		this.ctl = ctl;
		this.back = back;
		console.log(katex);
	}

	runUI() {
		this.ctl.ui.runUI<MyDefaultUIValues>({
			menuHeader: 'Katex Demo',
			exitAction: this.back
		});
		this.ctl.ui.setPlaceholder('Type some katex-flavoured latex...');
		this.ctl.menu.setMenuItems([
			{
				id: 'katex-preview-pane',
				type: 'vflex',
				children: [
					{
						id: 'katex-preview',
						type: 'fchild',
						style: {
							padding: '1rem',
							alignSelf: 'center'
						},
						textContent: 'Preview'
					}
				]
			},
			menuItemWithIcon({
				id: randomId(),
				leftIcon: settingsIcon,
				text: 'Do something...',
				action: () => {
					console.log('do something');
				}
			})
		]);
	}
}

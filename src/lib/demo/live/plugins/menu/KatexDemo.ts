import type { Controller } from '$lib/oneput/controller.js';
import katex from 'katex';
import { menuItemWithIcon, type MyDefaultUIValues } from '../../config/ui.js';
import { randomId } from '$lib/oneput/lib.js';
import { settingsIcon } from '$lib/oneput/shared/icons.js';

export class KatexDemo {
	static create(ctl: Controller, back: () => void) {
		return new KatexDemo(ctl, back);
	}

	unsetMenuItemsFn?: () => void;

	private exit = () => {
		this.unsetMenuItemsFn?.();
		this.back();
	};

	constructor(
		private ctl: Controller,
		private back: () => void
	) {
		console.log(katex);
	}

	runUI() {
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Katex Demo',
			exitAction: this.exit
		});
		this.ctl.ui.setPlaceholder('Type some katex-flavoured latex...');
		this.ctl.ui.setInputUI((inputUI) => {
			return {
				...inputUI,
				inputLines: 5
			};
		});
		this.ctl.menu.setMenuItems([
			{
				id: 'katex-preview-pane',
				type: 'vflex',
				ignored: true,
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
		this.ctl.input.focusInput();
		this.unsetMenuItemsFn = this.ctl.menu.setMenuItemsFn(() => {
			return undefined;
		});
	}
}

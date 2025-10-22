import type { Controller } from '$lib/oneput/controller.js';
import katex from 'katex';
import { menuItemWithIcon, type MyDefaultUIValues } from '../../config/ui.js';
import { randomId, type OneputProps } from '$lib/oneput/lib.js';
import { circleAlertIcon, settingsIcon } from '$lib/oneput/shared/icons.js';
import { checkboxMenuItem } from '$lib/oneput/plugins/ui/checkboxMenuItem.js';

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
		private back: () => void,
		private previewDisplayMode: boolean = false
	) {}

	runUI() {
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Katex Demo',
			exitAction: this.exit
		});
		this.ctl.menu.disableMenuOpenClose();
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
			}),
			checkboxMenuItem({
				action: (_, checked) => {
					this.previewDisplayMode = checked;
					this.renderPreview();
				},
				textContent: 'Display mode',
				checked: this.previewDisplayMode
			})
		]);
		this.ctl.input.focusInput();
		this.ctl.notify('Use shift+enter for newlines; enter will trigger the active menu item item');
		this.unsetMenuItemsFn = this.ctl.menu.setMenuItemsFn(() => {
			this.renderPreview();
		});
	}

	private renderPreview() {
		const el = document.getElementById('katex-preview');
		if (!el) {
			return;
		}
		try {
			el.innerHTML = katex.renderToString(this.ctl.input.getInputValue(), {
				displayMode: this.previewDisplayMode,
				throwOnError: true,
				output: 'mathml',
				errorColor: 'red'
			});
			this.setKatexValid(true);
		} catch {
			this.setKatexValid(false);
		}
	}

	private setKatexValid(valid: boolean) {
		this.ctl.ui.setInputUI((current) => {
			return {
				...current,
				right: valid
					? undefined
					: {
							id: randomId(),
							type: 'hflex',
							children: [
								{
									id: randomId(),
									type: 'fchild',
									classes: ['oneput__icon'],
									style: {
										color: 'var(--your-var, #c44)'
									},
									innerHTMLUnsafe: circleAlertIcon
								}
							]
						}
			} as OneputProps['inputUI'];
		});
	}
}

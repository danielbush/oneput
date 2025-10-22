import type { Controller } from '$lib/oneput/controller.js';
import katex from 'katex';
import type { Notification } from '$lib/oneput/plugins/ui/Notification.js';
import { menuItemWithIcon, type MyDefaultUIValues } from '../../config/ui.js';
import { randomId, type OneputProps } from '$lib/oneput/lib.js';
import { circleAlertIcon, settingsIcon } from '$lib/oneput/shared/icons.js';
import { checkboxMenuItem } from '$lib/oneput/plugins/ui/checkboxMenuItem.js';

const helpMessage = 'Use shift+enter for newlines; enter will trigger the active menu item item';

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
		private previewDisplayMode: boolean = false,
		private notify?: Notification
	) {}

	runUI() {
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Katex Demo',
			exitAction: this.exit
		});
		this.setMenuItems(true, '');
		this.setInputUI(true);
		this.ctl.menu.disableMenuOpenClose();
		this.ctl.ui.setPlaceholder('Type some katex-flavoured latex...');
		this.ctl.ui.setInputUI((inputUI) => {
			return {
				...inputUI,
				inputLines: 5
			};
		});
		this.ctl.input.focusInput();
		this.notify = this.ctl.notify(helpMessage);
		this.unsetMenuItemsFn = this.ctl.menu.setMenuItemsFn(() => {
			this.renderPreview();
		});
	}

	private setMenuItems(katexIsValid: boolean, katexResult?: string): void {
		this.ctl.menu.setMenuItems(
			[
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
							innerHTMLUnsafe: katexResult || '(preview)'
						}
					]
				},
				menuItemWithIcon({
					id: 'insert-katex-btn',
					leftIcon: settingsIcon,
					text: 'Insert...',
					attr: {
						disabled: !katexIsValid
					},
					action: () => {
						document.getElementById('page-content')!.innerHTML += `<p>${katex.renderToString(
							this.ctl.input.getInputValue(),
							{
								displayMode: false,
								throwOnError: true,
								output: 'mathml',
								errorColor: 'red'
							}
						)}</p>`;
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
			],
			// This will ensure the menuItemFocus index won't change when we hit the
			// checkbox above or any other action.
			{ focusBehaviour: 'none' }
		);
	}

	private currentResult = '';
	private renderPreview() {
		if (this.ctl.input.getInputValue().trim() === '') {
			this.setInputUI(true);
			this.setMenuItems(true, '');
			this.currentResult = '';
			return;
		}
		try {
			this.currentResult = katex.renderToString(this.ctl.input.getInputValue(), {
				displayMode: this.previewDisplayMode,
				throwOnError: true,
				output: 'mathml',
				errorColor: 'red'
			});
			this.setInputUI(true);
			this.setMenuItems(true, this.currentResult);
			this.notify?.updateMessage(helpMessage);
		} catch (err) {
			this.setInputUI(false);
			this.setMenuItems(false, this.currentResult);
			this.notify?.updateMessage('Invalid LaTeX: ' + (err as Error).message);
		}
	}

	private setInputUI(katexIsValid: boolean) {
		this.ctl.ui.setInputUI((current) => {
			return {
				...current,
				inputLines: 5,
				right: katexIsValid
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

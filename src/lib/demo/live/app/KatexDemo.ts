import type { Controller } from '$lib/oneput/controller.js';
import katex from 'katex';
import { type LayoutSettings } from '../layout.js';
import { type OneputProps } from '$lib/oneput/lib/lib.js';
import { circleAlertIcon, infoIcon, settingsIcon } from '$lib/oneput/shared/icons.js';
import { checkboxMenuItem } from '$lib/oneput/shared/ui/checkboxMenuItem.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/stdMenuItem.js';
import { divider, hflex, menuItem } from '$lib/oneput/lib/builder.js';

const helpMessage = 'Use shift+enter for newlines; enter will trigger the active menu item item';

export class KatexDemo {
	static create(ctl: Controller) {
		return new KatexDemo(ctl);
	}

	constructor(
		private ctl: Controller,
		private previewDisplayMode: boolean = false
	) {}

	runUI() {
		this.ctl.ui.runLayout<LayoutSettings>({
			menuHeader: 'Katex Demo'
		});
		this.renderMenuItems(true, '', 'first');
		this.renderInputUI(true);
		this.ctl.menu.enableMenuOpenClose(false);
		this.ctl.input.setPlaceholder('Type some katex-flavoured latex...');
		this.ctl.ui.setInputUI((inputUI) => {
			return {
				...inputUI,
				inputLines: 5
			};
		});
		this.ctl.input.focusInput();
		this.ctl.menu.setMenuItemsFn(() => {
			this.renderPreview();
		});
	}

	private renderMenuItems(
		katexIsValid: boolean,
		katexResult?: string,
		focusBehaviour?: 'none' | 'first' | 'last'
	): void {
		this.ctl.menu.setMenuItems(
			[
				menuItem({
					id: 'katex-preview-pane',
					type: 'vflex',
					ignored: true,
					children: [
						{
							id: 'katex-preview',
							type: 'fchild',
							style: {
								padding: '1rem',
								alignSelf: 'center',
								// TODO: we could make scale dynamic, with ui
								// buttons or a slider in the menu etc etc
								scale: katexResult ? '2.0' : '1'
							},
							innerHTMLUnsafe: katexResult || '(preview)'
						}
					]
				}),
				menuItem({
					id: 'katex-instructions',
					ignored: true,
					style: {
						color: '#777'
					},
					children: (b) => [
						b.icon({
							innerHTMLUnsafe: infoIcon
						}),
						b.fchild({
							textContent: helpMessage
						}),
						b.spacer()
					]
				}),
				divider(),
				stdMenuItem({
					id: 'insert-katex-btn',
					left: (b) => [b.icon({ innerHTMLUnsafe: settingsIcon })],
					textContent: 'Insert...',
					attr: {
						disabled: !katexIsValid
					},
					action: () => {
						document.getElementById('katex-demo')!.innerHTML += `<p>${katex.renderToString(
							this.ctl.input.getInputValue(),
							{
								displayMode: false,
								throwOnError: true,
								output: 'mathml',
								errorColor: 'red'
							}
						)}</p>`;
						this.ctl.input.setInputValue('');
						this.renderPreview();
					}
				}),
				checkboxMenuItem({
					id: 'katex-display-mode-checkbox',
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
			{ focusBehaviour: focusBehaviour ?? 'none' }
		);
	}

	private currentResult = '';
	private renderPreview() {
		if (this.ctl.input.getInputValue().trim() === '') {
			this.renderInputUI(true);
			this.renderMenuItems(true, '', 'none');
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
			this.renderInputUI(true);
			this.renderMenuItems(true, this.currentResult, 'none');
		} catch (err) {
			this.renderInputUI(false);
			this.renderMenuItems(false, this.currentResult, 'none');
			this.ctl.notify('Invalid katex: ' + (err as Error).message, { duration: 3000 });
		}
	}

	private renderInputUI(katexIsValid: boolean) {
		this.ctl.ui.setInputUI((current) => {
			return {
				...current,
				inputLines: 5,
				right: katexIsValid
					? undefined
					: hflex({
							id: 'katex-indicator',
							children: (b) => [
								b.fchild({
									classes: ['oneput__icon'],
									style: {
										color: '#c44'
									},
									innerHTMLUnsafe: circleAlertIcon
								})
							]
						})
			} as OneputProps['inputUI'];
		});
	}
}

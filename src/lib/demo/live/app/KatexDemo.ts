import type { Controller } from '$lib/oneput/controller.js';
import katex from 'katex';
import { type LayoutSettings } from '../layout.js';
import { type OneputProps } from '$lib/oneput/lib/lib.js';
import { circleAlertIcon, infoIcon, settingsIcon } from '$lib/oneput/shared/icons.js';
import { checkboxMenuItem } from '$lib/oneput/shared/ui/checkboxMenuItem.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/stdMenuItem.js';
import { divider, hflex, menuItem } from '$lib/oneput/lib/builder.js';
import { SubmitPlaceholder } from '$lib/oneput/shared/placeholders/SubmitPlaceholder.js';

export class KatexDemo {
	static create(ctl: Controller) {
		return new KatexDemo(
			ctl,
			SubmitPlaceholder.create(ctl, (binding) => `Type some katex and hit ${binding}...`)
		);
	}

	private currentResult = '';

	beforeExit = () => {
		this.unsubscribeBindingsChange?.();
	};

	private unsubscribeBindingsChange?: () => void;
	private helpMessage = 'Type some katex...';

	constructor(
		private ctl: Controller,
		private submitPlaceholder: SubmitPlaceholder,
		private previewDisplayMode: boolean = false
	) {
		this.unsubscribeBindingsChange = ctl.events.on('bindings-change', ({ isLocal }) => {
			if (!isLocal) {
				return;
			}
			const bindings = this.ctl.keys.getCurrentBindings(true);
			const binding = bindings['submit']?.bindings[0];
			this.helpMessage = binding
				? `Type some katex and hit ${binding} to insert... `
				: 'Type some katex...';
			this.renderUI();
		});
	}

	runUI() {
		this.ctl.ui.runLayout<LayoutSettings>({
			menuHeader: 'Katex Demo'
		});
		this.ctl.menu.enableMenuOpenClose(false);
		this.ctl.input.setPlaceholder(this.submitPlaceholder);
		this.ctl.input.focusInput();
		this.ctl.menu.setMenuItemsFn(() => {
			this.renderUI();
		});
		this.ctl.input.setSubmitHandler(() => {
			this.insertKatex();
		});
		this.renderUI();
	}

	private renderUI() {
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
					style: {
						overflow: 'auto',
						display: 'block',
						textAlign: 'center'
					},
					children: [
						{
							id: 'katex-preview',
							type: 'fchild',
							style: {
								padding: '1rem',
								fontSize: katexResult ? '150%' : '100%',
								display: 'inline-block'
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
							textContent: this.helpMessage
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
						this.insertKatex();
					}
				}),
				checkboxMenuItem({
					id: 'katex-display-mode-checkbox',
					action: (_, checked) => {
						this.previewDisplayMode = checked;
						this.renderUI();
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

	private insertKatex = () => {
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
		this.renderUI();
	};
}

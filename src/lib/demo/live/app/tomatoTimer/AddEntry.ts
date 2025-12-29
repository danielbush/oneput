import type { Controller } from '$lib/oneput/controller.js';
import type { AppObject, MenuItem, OneputProps } from '$lib/oneput/lib/lib.js';
import { SetDateTime } from '$lib/oneput/shared/appObjects/SetDateTime.js';
import { DynamicPlaceholder } from '$lib/oneput/shared/ui/DynamicPlaceholder.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/menuItems/stdMenuItem.js';
import type { FinishedSession } from './TomatoTimerValue.js';
import * as icons from '$lib/oneput/shared/icons.js';
import { DynamicText } from '$lib/oneput/shared/ui/DynamicText.js';
import { DateVal } from '$lib/oneput/shared/values/DateVal.js';

export class AddEntry implements AppObject {
	static create(ctl: Controller, session: Partial<FinishedSession>) {
		const dynamicPlaceholder = DynamicPlaceholder.create(ctl, (params) => {
			return params.submitBinding
				? `Hit ${params.submitBinding} to submit...`
				: 'Enter value and submit...';
		});
		const setDateTime = SetDateTime.create(ctl);
		return new AddEntry(ctl, session, dynamicPlaceholder, setDateTime);
	}

	private unsubscribeInputChange?: () => void;

	constructor(
		private ctl: Controller,
		private session: Partial<FinishedSession>,
		private dynamicPlaceholder: DynamicPlaceholder,
		private setDateTime: SetDateTime
	) {}

	beforeExit = () => {
		this.unsubscribeInputChange?.();
	};

	onMenuItemFocus = ({ menuItem }: { menuItem: MenuItem | undefined }) => {
		const item = menuItem;
		if (!item) {
			return;
		}
		this.unsubscribeInputChange?.();
		this.ctl.ui.setInputUI((current) => {
			return {
				...current,
				textArea: false
			} satisfies OneputProps['inputUI'];
		});
		this.ctl.input.focusInput();
		this.ctl.ui.update({ enableInputElement: true });
		switch (item.id) {
			case 'add-label':
				this.dynamicPlaceholder.setPlaceholder((params) => {
					return params.submitBinding
						? `Enter a label and hit ${params.submitBinding}...`
						: 'Enter label and submit...';
				});
				this.ctl.input.setInputValue(this.session.label ?? '');
				this.unsubscribeInputChange = this.ctl.events.on('input-change', ({ value }) => {
					this.session.label = value;
					this.ctl.menu.setMenuItems({ id: 'main', focusBehaviour: 'none', items: this.menuItems });
				});
				break;
			case 'add-note':
				this.ctl.ui.setInputUI((current) => {
					return {
						...current,
						textArea: { rows: 1 }
					} satisfies OneputProps['inputUI'];
				});
				this.ctl.input.setInputValue(this.session.note ?? '');
				this.dynamicPlaceholder.setPlaceholder((params) => {
					return params.submitBinding
						? `Enter a note and hit ${params.submitBinding}...`
						: 'Enter label and submit...';
				});
				this.unsubscribeInputChange = this.ctl.events.on('input-change', ({ value }) => {
					this.session.note = value;
					this.ctl.menu.setMenuItems({ id: 'main', focusBehaviour: 'none', items: this.menuItems });
				});
				break;
			case 'add-duration':
				this.dynamicPlaceholder.setPlaceholder((params) => {
					return params.submitBinding
						? `Enter a duration in minutes and hit ${params.submitBinding}...`
						: 'Enter duration in minutes and submit...';
				});
				this.ctl.input.setInputValue(this.session.duration?.toString() ?? '');
				this.unsubscribeInputChange = this.ctl.events.on('input-change', ({ value }) => {
					this.ctl.clearNotifications();
					this.session.duration = value === '' ? undefined : parseInt(value);
					if (this.session.duration !== undefined && isNaN(this.session.duration)) {
						this.ctl.notify('Could not parse a number for duration', { duration: 1500 });
						return;
					}
					this.ctl.menu.setMenuItems({ id: 'main', focusBehaviour: 'none', items: this.menuItems });
				});
				break;
			case 'add-startTime':
				this.ctl.input.setPlaceholder('Set start time and date...');
				this.ctl.ui.update({ enableInputElement: false });
				this.ctl.input.setInputValue();
				break;
		}
	};

	onStart() {
		this.run();
	}

	run() {
		this.ctl.ui.update({
			menuTitle: 'Add entry...'
		});
		this.ctl.menu.clearMenuItemsFn();
		this.ctl.menu.setMenuItems({
			id: 'main',
			focusBehaviour: 'last-action,first',
			items: this.menuItems
		});
	}

	get menuItems() {
		return [
			stdMenuItem({
				id: 'add-label',
				textContent: this.session.label ? `Label: ${this.session.label}` : 'Label...',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.tagIcon })],
				action: () => {
					this.ctl.input.focusInput();
				}
			}),
			stdMenuItem({
				id: 'add-note',
				textContent: this.session.note
					? `Note: ${this.session.note.replace(/\n/g, ' ').substring(0, 10)}...`
					: 'Note...',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.notebookPenIcon })],
				action: () => {
					this.ctl.ui.setInputUI((current) => {
						return {
							...current,
							textArea: { rows: 3 }
						} satisfies OneputProps['inputUI'];
					});
					this.ctl.input.focusInput();
				},
				bottom: {
					textContent: DynamicText.create(this.ctl).text(
						(t) => `Press ${t.doActionBinding} to expand the input...`
					)
				}
			}),
			stdMenuItem({
				id: 'add-duration',
				textContent: this.session.duration
					? `Duration: ${this.session.duration} minutes`
					: 'Duration...',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.timerIcon })],
				action: () => {
					this.ctl.input.focusInput();
				}
			}),
			stdMenuItem({
				id: 'add-startTime',
				textContent: this.session.startTime
					? DateVal.createFromUnixTime(this.session.startTime).dateString + '... (edit)'
					: 'Start time...',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.calendarCheckIcon })],
				right: (b) => [b.icon({ innerHTMLUnsafe: icons.chevronRightIcon })],
				action: () => {
					this.ctl.app.run(this.setDateTime);
				}
			})
		];
	}
}

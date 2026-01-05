import type { Controller } from '$lib/oneput/controllers/controller.js';
import type { AppObject, MenuItem, OneputProps } from '$lib/oneput/types.js';
import { SetDateTime } from '$lib/oneput/shared/appObjects/SetDateTime.js';
import { stdMenuItem } from '$lib/oneput/shared/ui/menuItems/stdMenuItem.js';
import type { FinishedSession } from './TomatoTimerValue.js';
import { DynamicText } from '$lib/oneput/shared/ui/DynamicText.js';
import { TimeVal } from '$lib/oneput/shared/values/TimeVal.js';
import { DateTimeVal } from '$lib/oneput/shared/values/DateTimeVal.js';
import { DateVal } from '$lib/oneput/shared/values/DateVal.js';
import { icons } from '../../icons.js';

export class AddEntry implements AppObject {
	static create(ctl: Controller, session: Partial<FinishedSession>) {
		const setDateTime = SetDateTime.create(ctl, {
			icons: {
				SetDateIcon: icons.CalendarCheck,
				SetTimeIcon: icons.Clock,
				Right: icons.ChevronRight
			},
			date:
				session.startTime === undefined ? undefined : DateVal.createFromUnixTime(session.startTime),
			time:
				session.startTime === undefined ? undefined : TimeVal.createFromUnixTime(session.startTime)
		});
		return new AddEntry(ctl, session, setDateTime);
	}

	private unsubscribeInputChange?: () => void;

	constructor(
		private ctl: Controller,
		private session: Partial<FinishedSession>,
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
		this.ctl.ui.update({ flags: { enableInputElement: true } });
		switch (item.id) {
			case 'add-label':
				this.ctl.input.setPlaceholder('Enter label...');
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
				this.ctl.input.setPlaceholder('Enter note...');
				this.unsubscribeInputChange = this.ctl.events.on('input-change', ({ value }) => {
					this.session.note = value;
					this.ctl.menu.setMenuItems({ id: 'main', focusBehaviour: 'none', items: this.menuItems });
				});
				break;
			case 'add-duration':
				this.ctl.input.setPlaceholder('Enter duration in hh:mm...');
				if (this.session.duration) {
					this.ctl.input.setInputValue(TimeVal.createFromSeconds(this.session.duration).timeString);
				} else {
					this.ctl.input.setInputValue('');
				}
				this.unsubscribeInputChange = this.ctl.events.on('input-change', ({ value }) => {
					this.ctl.clearNotifications();
					this.session.duration =
						value === '' ? undefined : TimeVal.createFromTimeString(value, /[: ]/).totalSeconds;
					if (this.session.duration !== undefined && isNaN(this.session.duration)) {
						this.ctl.notify('Could not parse a number for duration', { duration: 1500 });
						return;
					}
					this.ctl.menu.setMenuItems({ id: 'main', focusBehaviour: 'none', items: this.menuItems });
				});
				break;
			case 'add-startTime':
				this.ctl.input.setPlaceholder('Set start time and date...');
				this.ctl.ui.update({ flags: { enableInputElement: false } });
				this.ctl.input.setInputValue();
				break;
		}
	};

	onStart() {
		this.run();
	}

	run() {
		this.ctl.ui.update({
			params: {
				menuTitle: 'Add entry...'
			}
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
				left: (b) => [b.icon(icons.Tag)],
				action: () => {
					this.ctl.input.focusInput();
				}
			}),
			stdMenuItem({
				id: 'add-note',
				textContent: this.session.note
					? `Note: ${this.session.note.replace(/\n/g, ' ').substring(0, 10)}...`
					: 'Note...',
				left: (b) => [b.icon(icons.NotebookPen)],
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
					? `Duration: ${TimeVal.createFromSeconds(this.session.duration).longTimeString}`
					: 'Duration...',
				left: (b) => [b.icon(icons.Timer)],
				action: () => {
					this.ctl.input.focusInput();
				}
			}),
			stdMenuItem({
				id: 'add-startTime',
				textContent: this.session.startTime
					? 'Start: ' +
						DateTimeVal.createFromUnixTime(this.session.startTime).dateTimeString +
						'...'
					: 'Start time...',
				left: (b) => [b.icon(icons.CalendarCheck)],
				right: (b) => [b.icon(icons.ChevronRight)],
				action: () => {
					this.ctl.app.run(this.setDateTime);
				}
			})
		];
	}
}

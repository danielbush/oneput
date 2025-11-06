import type { Controller } from '$lib/oneput/controller.js';
import { stdMenuItem } from '$lib/oneput/stdMenuItem.js';
import type { MyDefaultUIValues } from '../../config/ui.js';
import * as icons from '$lib/oneput/shared/icons.js';

export class TomatoTimer {
	static create(ctl: Controller, back: () => void) {
		return new TomatoTimer(ctl, back);
	}

	private exit = () => {
		this.back();
	};

	constructor(
		private ctl: Controller,
		private back: () => void
	) {}

	private timerIsRunning: boolean = false;

	private startTimer() {
		this.timerIsRunning = true;
	}

	private stopTimer() {
		this.timerIsRunning = false;
	}

	runUI() {
		this.ctl.ui.runDefaultUI<MyDefaultUIValues>({
			menuHeader: 'Tomato Timer',
			exitAction: this.exit
		});
		if (this.timerIsRunning) {
			this.timerUI();
		} else {
			this.noTimerUI();
		}
	}

	/**
	 * The UI we see if there is no existing timer.
	 */
	private noTimerUI() {
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'tomato-start',
				textContent: 'Start',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.playIcon })],
				action: () => {
					this.startTimer();
					this.runUI();
				}
			})
		]);
	}

	/**
	 * The UI we see if there is an existing timer.
	 */
	private timerUI() {
		this.ctl.menu.setMenuItems([
			stdMenuItem({
				id: 'tomato-stop',
				textContent: 'Stop',
				left: (b) => [b.icon({ innerHTMLUnsafe: icons.stopIcon })],
				action: () => {
					this.stopTimer();
					this.runUI();
				}
			})
		]);
	}
}

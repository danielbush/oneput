import type { Controller } from '$lib/oneput/controller.js';
import { FuzzyFilter } from '$lib/oneput/filters/FuzzyFilter.js';
import { randomId } from '$lib/oneput/lib.js';
import { menuItemNoIcon } from '../../config/ui.js';

/**
 * Demonstrates how we navigate the headings in an html document using Oneput.
 */
export class NavigateHeadings {
	static create(ctl: Controller, document: Document, back: () => void) {
		return new NavigateHeadings(ctl, document, back, FuzzyFilter.create());
	}

	private clearInputChangeListener?: () => void;

	private constructor(
		private ctl: Controller,
		private document: Document,
		private back: () => void,
		private fuzzyFilter: FuzzyFilter
	) {}

	run() {
		this.ctl.ui.run({
			menuHeader: 'Navigate Headings',
			exitAction: this.exit
		});
		const menuAction = (heading: HTMLElement) => {
			heading.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
			this.ctl.menu.closeMenu();
			// Reset the input and menu:
			this.ctl.input.setInputValue();
			this.ctl.menu.setMenuItems(menuItems);
		};
		const menuItem = (heading: HTMLElement) =>
			menuItemNoIcon({
				id: randomId(),
				text: heading.textContent,
				action: () => {
					menuAction(heading);
				}
			});
		this.ctl.setBackBinding(this.exit);

		// Initialize headings and menu items...
		const headings: HTMLElement[] = Array.from(this.document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
		const menuItems = headings.map((h) => menuItem(h));
		this.ctl.menu.setMenuItems(menuItems);

		// Demo how to handle typed input by handling onInputChange directly and
		// disable menuItemsFn...
		this.ctl.menu.disableMenuItemsFn();
		this.clearInputChangeListener = this.ctl.input.onInputChange((evt) => {
			const input = (evt.target as HTMLInputElement).value;
			const sortedMenuItems = this.fuzzyFilter.menuItemsFn(input, menuItems);
			if (!sortedMenuItems) {
				return;
			}
			this.ctl.menu.setMenuItems(sortedMenuItems);
		});
	}

	/**
	 * It's important to clean up once we exit this mini-app.
	 */
	private exit = () => {
		this.ctl.menu.enableMenuItemsFn();
		this.ctl.input.setInputValue();
		this.clearInputChangeListener?.();
		this.back();
	};
}

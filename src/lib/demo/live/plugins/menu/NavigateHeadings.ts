import type { Controller } from '$lib/oneput/controller.js';
import { randomId } from '$lib/oneput/lib.js';
import { menuItemNoIcon } from '../../config/ui.js';

/**
 * Demonstrates how we navigate the headings in an html document using Oneput.
 */
export class NavigateHeadings {
	static create(controller: Controller, document: Document, back: () => void) {
		return new NavigateHeadings(controller, document, back);
	}

	private headings: HTMLElement[] = [];
	private clearInputChangeListener?: () => void;

	private constructor(
		private controller: Controller,
		private document: Document,
		private back: () => void
	) {}

	run() {
		this.controller.ui.applyDefaultUI({
			menuHeader: 'Navigate Headings',
			exitAction: this.exit
		});
		this.headings = Array.from(this.document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
		this.controller.setBackBinding(this.exit);
		this.controller.menu.setMenuItems(
			this.headings.map((h) =>
				menuItemNoIcon({
					id: randomId(),
					text: h.textContent,
					action: () => {
						h.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
						this.controller.menu.closeMenu();
						// Reset the input and menu:
						this.controller.input.setInputValue();
					}
				})
			)
		);

		// We demo here how to handle typed input by handling onInputChange
		// directly and disable menuItemsFn...
		this.controller.menu.disableMenuItemsFn();
		this.clearInputChangeListener = this.controller.input.onInputChange((evt) => {
			const text = (evt.target as HTMLInputElement).value;
			const filteredHeadings = this.headings.filter((heading) => {
				return heading.textContent.includes(text);
			});
			this.controller.menu.setMenuItems(
				filteredHeadings.map((h) =>
					menuItemNoIcon({
						id: randomId(),
						text: h.textContent,
						action: () => {
							h.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
							this.controller.menu.closeMenu();
							// Reset the input and menu:
							this.controller.input.setInputValue();
						}
					})
				)
			);
		});
	}

	/**
	 * It's important to clean up once we exit this mini-app.
	 */
	private exit = () => {
		this.controller.menu.enableMenuItemsFn();
		this.controller.input.setInputValue();
		this.clearInputChangeListener?.();
		this.back();
	};
}

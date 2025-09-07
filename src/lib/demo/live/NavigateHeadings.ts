import type { Controller } from '$lib/oneput/controller.js';
import { id } from '$lib/oneput/lib.js';
import { menuHeaderUI, menuItemNoIcon } from '$lib/ui.js';

/**
 * Demonstates how we navigate the headings in an html document using Oneput.
 */
export class NavigateHeadings {
	static create(controller: Controller, document: Document, back: () => void) {
		return new NavigateHeadings(controller, document, back);
	}

	private headings: HTMLElement[] = [];
	private filteredHeadings: HTMLElement[] = [];

	private constructor(
		private controller: Controller,
		private document: Document,
		private back: () => void
	) {
		this.headings = Array.from(this.document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
		this.filteredHeadings = this.headings;
		this.controller.update({
			onInputChange: (evt) => {
				const text = (evt.target as HTMLInputElement).value;
				this.filteredHeadings = this.headings.filter((heading) => {
					return heading.textContent.includes(text);
				});
				this.updateUI();
			}
		});
		this.controller.setBackBinding(this.exit);
		this.updateUI();
	}

	/**
	 * It's important to clean up once we exit this mini-app.
	 */
	private exit = () => {
		this.controller.update({
			onInputChange: undefined,
			inputValue: undefined
		});
		this.back();
	};

	private updateUI = () => {
		this.controller.update({
			menu: {
				header: menuHeaderUI({ title: 'Navigate Headings', exit: this.exit }),
				items: this.filteredHeadings.map((h) =>
					menuItemNoIcon({
						id: id(),
						text: h.textContent,
						action: () => {
							h.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
							this.controller.closeMenu();
							// Reset the input and menu:
							this.controller.update({ inputValue: '' });
							this.filteredHeadings = this.headings;
							this.updateUI();
						}
					})
				)
			}
		});
	};
}

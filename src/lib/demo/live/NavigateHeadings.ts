import type { Controller } from '$lib/oneput/controller.js';
import { id } from '$lib/oneput/lib.js';
import { menuItemNoIcon } from '$lib/ui.js';

/**
 * Demonstates how we navigate the headings in an html document using Oneput.
 */
export class NavigateHeadings {
	static create(controller: Controller, document: Document) {
		return new NavigateHeadings(controller, document);
	}

	private headings: HTMLElement[] = [];
	private filteredHeadings: HTMLElement[] = [];

	private constructor(
		private controller: Controller,
		private document: Document
	) {
		this.headings = Array.from(this.document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
		this.filteredHeadings = this.headings;
		this.controller.update({
			handleInputChange: (evt) => {
				const text = (evt.target as HTMLInputElement).value;
				this.filteredHeadings = this.headings.filter((heading) => {
					return heading.textContent.includes(text);
				});
				this.updateMenu();
			}
		});
		this.updateMenu();
	}

	private updateMenu = () => {
		this.controller.update({
			menu: {
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
							this.updateMenu();
						}
					})
				)
			}
		});
	};
}

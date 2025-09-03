import type { Controller } from '$lib/oneput/controller.js';
import { id } from '$lib/oneput/lib.js';
import { arrowLeftIcon, menuItemNoIcon, menuItemWithIcon, tocIcon } from '$lib/ui.js';

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
			handleInputChange: (evt) => {
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
			handleInputChange: undefined,
			inputValue: undefined
		});
		this.back();
	};

	private updateUI = () => {
		this.controller.update({
			menu: {
				header: {
					id: 'bindings-header',
					type: 'hflex',
					children: [
						{
							id: 'bindings-header-icon',
							type: 'fchild',
							style: { flex: '1' },
							innerHTMLUnsafe: tocIcon
						},
						{
							id: 'bindings-header-text',
							type: 'fchild',
							style: { justifyContent: 'center', flex: '3' },
							textContent: `Navigate headings`
						},
						{
							id: 'bindings-header-close',
							type: 'fchild',
							style: { flex: '1' }
						}
					]
				},
				items: [
					menuItemWithIcon({
						id: 'back',
						text: 'Back...',
						leftIcon: arrowLeftIcon,
						action: this.exit
					}),
					{
						id: id(),
						tag: 'hr',
						type: 'hflex',
						class: 'oneput__menu-divider',
						ignored: true
					},
					...this.filteredHeadings.map((h) =>
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
				]
			}
		});
	};
}

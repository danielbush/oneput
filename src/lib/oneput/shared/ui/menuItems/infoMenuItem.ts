import type { MenuItem } from '../../../types.js';
import { menuItem, type BuilderMenuItem } from '../../../lib/builder.js';

export function infoMenuItem({
	id,
	msg,
	params = {},
	icon
}: {
	id: string;
	msg: string;
	params?: Omit<Partial<BuilderMenuItem>, 'id'>;
	icon: string;
}): MenuItem {
	return menuItem({
		ignored: true,
		// TODO: some kind of class for this style?
		style: {
			color: '#777'
		},
		children: (b) => [
			b.icon({
				icon
			}),
			b.fchild({
				textContent: msg
			}),
			b.spacer()
		],
		...params,
		id
	});
}

import type { MenuItem } from '../../../types.js';
import { menuItem, type BuilderMenuItem } from '../../../lib/builder.js';
import { icons } from '$lib/demo/live/icons.js';

export function infoMenuItem(
	id: string,
	msg: string,
	params: Omit<Partial<BuilderMenuItem>, 'id'> = {}
): MenuItem {
	return menuItem({
		ignored: true,
		style: {
			color: '#777'
		},
		children: (b) => [
			b.icon({
				icon: icons.Info
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

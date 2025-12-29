import type { MenuItem } from '../../../lib/lib.js';
import { menuItem, type BuilderMenuItem } from '../../../lib/builder.js';
import { infoIcon } from '../../icons.js';

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
				innerHTMLUnsafe: infoIcon
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

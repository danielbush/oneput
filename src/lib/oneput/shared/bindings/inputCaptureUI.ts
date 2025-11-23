import { hflex } from '../../builder.js';
import type { Controller } from '../../controller.js';
import * as icons from '../../shared/icons.js';

export const inputCaptureUI = (
	ctl: Controller,
	captureAction: { accept: (evt: Event) => void; reject: (evt: Event) => void }
) => {
	const { accept, reject } = captureAction;
	ctl.ui.setInputUI({
		right: hflex({
			id: 'input-right-1',
			children: (b) => [
				b.fchild({
					tag: 'button',
					attr: {
						type: 'button',
						title: 'Options',
						onclick: accept
					},
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: icons.tickIcon
				}),
				b.fchild({
					tag: 'button',
					attr: {
						type: 'button',
						title: 'Options',
						onclick: reject
					},
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: icons.xIcon
				})
			]
		})
	});
};

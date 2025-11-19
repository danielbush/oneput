import type { Controller } from '$lib/oneput/controller.js';
import * as icons from '$lib/oneput/shared/icons.js';

export const inputCaptureUI = (
	ctl: Controller,
	captureAction: { accept: (evt: Event) => void; reject: (evt: Event) => void }
) => {
	const { accept, reject } = captureAction;
	ctl.ui.setInputUI({
		right: {
			id: 'input-right-1',
			type: 'hflex',
			children: [
				{
					id: 'accept-key-capture',
					type: 'fchild',
					tag: 'button',
					attr: {
						type: 'button',
						title: 'Options',
						onclick: accept
					},
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: icons.tickIcon
				},
				{
					id: 'reject-key-capture',
					type: 'fchild',
					tag: 'button',
					attr: {
						type: 'button',
						title: 'Options',
						onclick: reject
					},
					classes: ['oneput__icon-button'],
					innerHTMLUnsafe: icons.xIcon
				}
			]
		}
	});
};

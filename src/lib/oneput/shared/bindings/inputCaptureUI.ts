import { mountSvelte } from '$lib/oneput/lib.js';
import { hflex } from '../../builder.js';
import type { Controller } from '../../controller.js';
import * as icons from '../../shared/icons.js';
import AcceptButton from './AcceptButton.svelte';

export const inputCaptureUI = (
	ctl: Controller,
	captureAction: { accept: (evt: Event) => void; reject: (evt: Event) => void }
) => {
	const { accept, reject } = captureAction;
	ctl.ui.setInputUI({
		right: hflex({
			id: 'input-right-1',
			children: (b) => [
				// Here we mount a svelte component and rely on the reactivity
				// of controller.currentProps which is reactive; also see
				// OneputController.svelte .  We can't pass
				// controller.currentProps.inputValue directly (even though
				// we're not destructuring), probably because onMount is not in
				// a reactive context.   Alternatively, we could also listen to
				// input value changes via ctl.input and call setInputUI again
				// if we didn't want to use svelte.
				b.fchild({
					onMount: (node) =>
						mountSvelte(AcceptButton, {
							target: node,
							props: { controller: ctl, onClick: accept }
						})
				}),
				/*
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
				*/
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

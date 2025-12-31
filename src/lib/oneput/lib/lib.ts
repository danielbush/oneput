import type { Attachment } from 'svelte/attachments';
import { mount, type Component } from 'svelte';
import type { FChildParams, FlexParams, MenuItemAny } from '../types.js';

export const defaultVoidElements = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr'
]);

/**
 * Generate a unique id.
 */
export function randomId(): string {
	if (!window.crypto.randomUUID) {
		window.crypto.randomUUID = function () {
			// RFC4122 version 4 UUID generator using crypto.getRandomValues
			const bytes = new Uint8Array(16);
			window.crypto.getRandomValues(bytes);
			// Set version bits (4) and variant bits (RFC4122)
			bytes[6] = (bytes[6] & 0x0f) | 0x40;
			bytes[8] = (bytes[8] & 0x3f) | 0x80;
			const hexBytes = [...bytes].map((b) => b.toString(16).padStart(2, '0'));
			return `${hexBytes.slice(0, 4).join('')}-${hexBytes.slice(4, 6).join('')}-${hexBytes.slice(6, 8).join('')}-${hexBytes.slice(8, 10).join('')}-${hexBytes.slice(10, 16).join('')}`;
		};
	}
	return 'id-' + crypto.randomUUID();
}

export function hideShowListener(show: boolean): Attachment<HTMLElement> {
	return (btn: HTMLElement) => {
		btn.style.display = show ? '' : 'none';
		window.addEventListener('oneput-toggle-hide', () => {
			btn.style.display = btn.style.display === 'none' ? '' : 'none';
		});

		return () => {
			window.removeEventListener('oneput-toggle-hide', () => {
				btn.style.display = btn.style.display === 'none' ? '' : 'none';
			});
		};
	};
}

export function isMacOS() {
	return (
		// Extend the Navigator type to include userAgentData if it exists
		(typeof navigator !== 'undefined' &&
			// @ts-expect-error: userAgentData is not yet in all TS DOM types
			navigator.userAgentData &&
			// @ts-expect-error: userAgentData is not yet in all TS DOM types
			navigator.userAgentData.platform === 'macOS') ||
		(navigator.platform && navigator.platform.toLowerCase().includes('mac')) ||
		/mac/i.test(navigator.userAgent)
	);
}

export function walk(
	item: FlexParams | FChildParams,
	cb: (item: FlexParams | FChildParams) => void
) {
	if (item.type === 'hflex' || item.type === 'vflex') {
		cb(item);
		for (const child of item.children || []) {
			if (!child) {
				continue;
			}
			walk(child, cb);
		}
		return;
	}
	if (item.type === 'fchild') {
		cb(item);
		return;
	}
}

/**
 * Used by menu controller to determine if the menu item is focusable.
 *
 * Handles ignored and disabled attribute for buttons/form controls.
 *
 * For convenience, you can pass undefined - helps with indexed optional chained
 * access to a menu item.
 */
export function isFocusable(item?: MenuItemAny) {
	if (!item) {
		return false;
	}
	return !item.ignored && !('disabled' in (item.attr ?? {}) && item.attr?.disabled);
}

export function mountSvelte<P extends Record<string, unknown>>(
	component: Component<P>,
	{ target, props }: { target: HTMLElement; props: P }
) {
	mount(component, { target, props });
}

export function createStyleAttribute(style: Partial<CSSStyleDeclaration>) {
	const browserOnly = globalThis.document;
	if (browserOnly) {
		const tmp = document.createElement('div');
		Object.assign(tmp.style, style);
		return tmp.style.cssText;
	}
}

import {
	randomId,
	type FChildParams,
	type FlexChildren,
	type FlexParams,
	type MenuItem
} from './lib.js';

export type BuilderFlexParams = Partial<Omit<FlexParams, 'children'>> & {
	children?: FlexChildren | ((b: FlexChildBuilder) => FlexChildren);
};

export type BuilderMenuItem = Partial<Omit<MenuItem, 'children'>> & {
	children?: FlexChildren | ((b: FlexChildBuilder) => FlexChildren);
};

function flex(params: BuilderFlexParams): FlexParams {
	const id = params.id ?? randomId();
	let children: FlexChildren | undefined;
	if (typeof params.children === 'function') {
		children = params.children(new FlexChildBuilder(id));
	} else {
		children = params.children;
	}
	const result: FlexParams = {
		...params,
		id,
		children,
		type: params.type ?? 'hflex'
	};
	return result;
}

export function hflex(params: BuilderFlexParams): FlexParams {
	return flex({ ...params, type: 'hflex' });
}

export function vflex(params: BuilderFlexParams): FlexParams {
	return flex({ ...params, type: 'vflex' });
}

export function fchild(params: Partial<FChildParams>): FChildParams {
	const result: FChildParams = {
		...params,
		id: params.id ?? randomId(),
		type: 'fchild'
	};
	return result;
}

export function menuItem(params: Partial<BuilderMenuItem>): MenuItem {
	const result: MenuItem = flex({
		...params,
		id: params.id ?? randomId(),
		type: params.type ?? 'hflex'
	});
	return result;
}

/**
 * This is intended for flex children in a hflex or vflex whose numerical
 * position has layout significance.
 *
 * Used when doing layouts within Oneput or within menu items.
 */
export class FlexChildBuilder {
	constructor(
		private id: string,
		private counter: number = 0
	) {}

	hflex(params: BuilderFlexParams): FlexParams {
		return hflex({ ...params, id: params.id ?? this.id + '-' + this.counter++ });
	}

	vflex(params: BuilderFlexParams): FlexParams {
		return vflex({ ...params, id: params.id ?? this.id + '-' + this.counter++ });
	}

	fchild(params: Partial<FChildParams>): FChildParams {
		return fchild({ ...params, id: params.id ?? this.id + '-' + this.counter++ });
	}

	icon(params: Partial<FChildParams>): FChildParams {
		return icon({ ...params, id: params.id ?? this.id + '-' + this.counter++ });
	}

	iconButton(params: Partial<FChildParams> & { title: string }): FChildParams {
		return iconButton({ ...params, id: params.id ?? this.id + '-' + this.counter++ });
	}

	spacer(h: boolean = true, v: boolean = true, params?: Partial<FChildParams>): FChildParams {
		return spacer(h, v, { id: this.id + '-' + this.counter++, ...(params ?? {}) });
	}
}

/**
 * Represents a square icon.
 *
 * TODO: set htmlContentUnsafe to never?
 */
export function icon(params: Partial<FChildParams>): FChildParams {
	return fchild({
		classes: ['oneput__icon'],
		textContent: params.textContent,
		innerHTMLUnsafe: params.innerHTMLUnsafe,
		...params,
		style: { alignSelf: 'flex-start', ...params.style }
	});
}

/**
 * By default takes up --oneput-std-width of width and height.
 *
 * --oneput-std-width generally matches the size of an icon or icon button.
 *
 * If h is false, it will not take up width.
 * If v is false, it will not take up height.
 */
export function spacer(
	h: boolean = true,
	v: boolean = true,
	params?: Partial<FChildParams>
): FChildParams {
	const classes = [];
	if (h) {
		classes.push('oneput__hspacer');
	}
	if (v) {
		classes.push('oneput__vspacer');
	}
	return fchild({
		classes,
		...params
	});
}

/**
 * Like icon but turns the icon into a button.
 */
export function iconButton(params: Partial<FChildParams> & { title: string }): FChildParams {
	return fchild({
		classes: ['oneput__icon-button'],
		tag: 'button',
		textContent: params.textContent,
		innerHTMLUnsafe: params.innerHTMLUnsafe,
		...params,
		style: { alignSelf: 'flex-start', ...params.style },
		attr: { type: 'button', title: params.title, ...params.attr }
	});
}

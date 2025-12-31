/**
 * Icon Registry - allows registration and rendering of icons from various sources.
 *
 * Supports:
 * - Raw SVG strings
 * - Lucide icons (or any library that exports functions returning SVGElement)
 * - Custom element factories
 */

// Icon source types - supports multiple icon libraries
export type IconSource =
	| { type: 'svg'; svg: string } // Raw SVG string
	| { type: 'lucide'; icon: () => SVGElement } // Lucide icon (props baked in at registration)
	| { type: 'element'; create: () => Element }; // Custom factory function

// Registry for icons - webapp registers icons upfront
const iconRegistry = new Map<string, IconSource>();

/**
 * Register a single icon by name.
 */
export function registerIcon(name: string, source: IconSource): void {
	iconRegistry.set(name, source);
}

/**
 * Register multiple icons at once.
 */
export function registerIcons(icons: Record<string, IconSource>): void {
	for (const [name, source] of Object.entries(icons)) {
		iconRegistry.set(name, source);
	}
}

/**
 * Get an icon source by name (for inspection/debugging).
 */
export function getIconSource(name: string): IconSource | undefined {
	return iconRegistry.get(name);
}

/**
 * Renders an icon into a target element.
 * Used internally by FChild.svelte when an icon prop is specified.
 */
export function renderIcon(name: string, target: HTMLElement): void {
	let source = iconRegistry.get(name);
	if (!source) {
		console.warn(`Icon "${name}" not found in registry`);
		source = missingIcon;
	}

	target.innerHTML = ''; // Clear existing content

	switch (source.type) {
		case 'svg':
			target.innerHTML = source.svg;
			break;
		case 'lucide':
			target.appendChild(source.icon());
			break;
		case 'element':
			target.appendChild(source.create());
			break;
	}
}

/**
 * Helper to create a lucide icon source.
 * Usage: lucide(() => createElement(X)) where X is imported from 'lucide'
 */
export function lucide(icon: () => SVGElement): IconSource {
	return { type: 'lucide', icon };
}

/**
 * Helper to create an SVG string icon source.
 * Usage: svg('<svg>...</svg>')
 */
export function svg(svgString: string): IconSource {
	return { type: 'svg', svg: svgString };
}

export const missingIcon = svg(
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-off-icon lucide-image-off"><line x1="2" x2="22" y1="2" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><line x1="13.5" x2="6" y1="13.5" y2="21"/><line x1="18" x2="21" y1="12" y2="15"/><path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"/><path d="M21 15V5a2 2 0 0 0-2-2H9"/></svg>'
);

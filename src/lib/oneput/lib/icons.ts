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
	| { type: 'lucide'; icon: (props?: Record<string, unknown>) => SVGElement } // Lucide icon
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
	const source = iconRegistry.get(name);
	console.log('renderIcon', source, name, target);
	if (!source) {
		console.warn(`Icon "${name}" not found in registry`);
		return;
	}

	target.innerHTML = ''; // Clear existing content

	switch (source.type) {
		case 'svg':
			target.innerHTML = source.svg;
			break;
		case 'lucide':
			console.log('lucide', source.icon());
			target.appendChild(source.icon());
			break;
		case 'element':
			target.appendChild(source.create());
			break;
	}
}

/**
 * Helper to create a lucide icon source.
 * Usage: lucide(X) where X is imported from 'lucide'
 */
export function lucide(icon: (props?: Record<string, unknown>) => SVGElement): IconSource {
	return { type: 'lucide', icon };
}

/**
 * Helper to create an SVG string icon source.
 * Usage: svg('<svg>...</svg>')
 */
export function svg(svgString: string): IconSource {
	return { type: 'svg', svg: svgString };
}

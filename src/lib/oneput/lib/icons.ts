/**
 * Icon Registry - allows registration and rendering of icons from various sources.
 *
 * An IconRenderer is simply a function that renders an icon into a target element.
 * This strategy pattern allows any icon library or custom rendering approach.
 */

// Strategy: a function that renders an icon into a target element
export type IconRenderer = (target: HTMLElement) => void;

// Registry for icons - webapp registers icons upfront
const iconRegistry = new Map<string, IconRenderer>();

/**
 * Register a single icon by name.
 */
export function registerIcon(name: string, renderer: IconRenderer): void {
	iconRegistry.set(name, renderer);
}

/**
 * Register multiple icons at once.
 */
export function registerIcons(icons: Record<string, IconRenderer>): void {
	for (const [name, renderer] of Object.entries(icons)) {
		iconRegistry.set(name, renderer);
	}
}

/**
 * Get an icon renderer by name (for inspection/debugging).
 */
export function getIconRenderer(name: string): IconRenderer | undefined {
	return iconRegistry.get(name);
}

/**
 * Renders an icon into a target element.
 * Used internally by FChild.svelte when an icon prop is specified.
 */
export function renderIcon(name: string, target: HTMLElement): void {
	const renderer = iconRegistry.get(name);
	if (!renderer) {
		console.warn(`Icon "${name}" not found in registry`);
		missingIcon(target);
		return;
	}
	target.innerHTML = ''; // Clear existing content
	renderer(target);
}

// ============================================================
// Built-in strategies (convenience helpers)
// ============================================================

/**
 * Strategy for raw SVG strings.
 * Usage: svg('<svg>...</svg>')
 */
export function svg(svgString: string): IconRenderer {
	return (target) => {
		target.innerHTML = svgString;
	};
}

/**
 * Strategy for element factories (works with Lucide, or any library).
 * Usage: element(() => createElement(X))
 */
export function element(create: () => Element): IconRenderer {
	return (target) => {
		target.appendChild(create());
	};
}

/**
 * Alias for element() - for clarity when using Lucide specifically.
 * Usage: lucide(() => createElement(X))
 */
export const lucide = element;

/**
 * Missing icon fallback renderer.
 */
export const missingIcon: IconRenderer = svg(
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-off-icon lucide-image-off"><line x1="2" x2="22" y1="2" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><line x1="13.5" x2="6" y1="13.5" y2="21"/><line x1="18" x2="21" y1="12" y2="15"/><path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"/><path d="M21 15V5a2 2 0 0 0-2-2H9"/></svg>'
);

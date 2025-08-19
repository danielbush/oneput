// This fixes the IDE's typescript ts(2307) errors when import svelte
// components.  sveltekit doesn't need this, just the IDE.  This maybe points to
// an issue with the tyepscript configuration that sveltekit is providing to the
// editor.

declare module '*.svelte' {
	import { Component } from 'svelte';
	const component: Component;
	export default component;
}

declare module 'tinykeys' {
	import { TinyKeys } from 'tinykeys';
	const tinykeys: TinyKeys;
	export { tinykeys };
}

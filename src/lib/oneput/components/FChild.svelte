<script lang="ts">
	import { onMount } from 'svelte';
	import { defaultVoidElements, type FChildParams } from '../lib.js';

	type Props = FChildParams;
	let node: HTMLElement | null = $state(null);
	let { voidElements, ...props }: Props = $props();
	let voidElementsSet = $derived(voidElements || defaultVoidElements);

	onMount(() => {
		if (props.style) {
			Object.assign(node!.style, props.style);
		}
		if (props.onMount) {
			return props.onMount(node!);
		}
	});
</script>

{#if voidElementsSet.has(props.tag)}
	<svelte:element
		this={props.tag}
		id={props.id}
		bind:this={node}
		class={['oneput__fchild', ...(props.classes || [])]}
		{...props.attr}
	/>
{:else}
	<svelte:element
		this={props.tag || 'div'}
		id={props.id}
		bind:this={node}
		class={['oneput__fchild', ...(props.classes || [])]}
		{...props.attr}
	>
		{#if props.derivedHTML}
			<!-- eslint-disable svelte/no-at-html-tags -->
			{@html props.derivedHTML}
			<!-- eslint-enable svelte/no-at-html-tags -->
		{:else if props.htmlContentUnsafe}
			<!-- eslint-disable svelte/no-at-html-tags -->
			{@html props.htmlContentUnsafe}
			<!-- eslint-enable svelte/no-at-html-tags -->
		{:else if props.innerHTMLUnsafe}
			<!-- eslint-disable svelte/no-at-html-tags -->
			{@html props.innerHTMLUnsafe}
			<!-- eslint-enable svelte/no-at-html-tags -->
		{:else if props.textContent}
			{props.textContent}
		{/if}
	</svelte:element>
{/if}

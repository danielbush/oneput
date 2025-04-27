<script lang="ts">
	import { onMount } from 'svelte';
	import { defaultVoidElements, type FChildParams } from './lib.js';

	type Props = FChildParams;
	let node: HTMLElement | null = $state(null);
	let { voidElements, ...props }: Props = $props();
	voidElements = voidElements || defaultVoidElements;

	onMount(() => {
		if (props.style) {
			Object.assign(node!.style, props.style);
		}
		if (props.onMount) {
			return props.onMount(node!);
		}
	});
</script>

{#if voidElements.has(props.tag)}
	<svelte:element
		this={props.tag}
		id={props.id}
		bind:this={node}
		class={['oneput__fchild', ...(props.classes || [])]}
		{...props.attr}
		onpointerdown={(evt) => props.onPointerDown?.(evt, node!)}
	/>
{:else}
	<svelte:element
		this={props.tag || 'div'}
		id={props.id}
		bind:this={node}
		class={['oneput__fchild', ...(props.classes || [])]}
		{...props.attr}
		onpointerdown={(evt) => props.onPointerDown?.(evt, node!)}
	>
		{#if props.textContent}
			{props.textContent}
		{:else if props.innerHTMLUnsafe}
			{@html props.innerHTMLUnsafe}
		{/if}
	</svelte:element>
{/if}

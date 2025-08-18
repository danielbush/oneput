<!-- TODO: rename to Flex.svelte -->
<script lang="ts">
	import FChild from './FChild.svelte';
	import { defaultVoidElements, type FChildParams, type FlexParams } from './lib.js';

	type Props = { class: string } & FlexParams;
	let { voidElements, class: topLevelClass, ...props }: Props = $props();
	voidElements = voidElements || defaultVoidElements;

	function createStyle(style: Partial<CSSStyleDeclaration>) {
		const browserOnly = globalThis.document;
		if (browserOnly) {
			const tmp = document.createElement('div');
			Object.assign(tmp.style, style);
			return tmp.style.cssText;
		}
	}
</script>

{#snippet flex(params: FlexParams, nested: boolean = false)}
	{#if props.tag === 'hr'}
		<svelte:element
			this={params.tag}
			id={params.id}
			style={params.style && createStyle(params.style)}
			class={[
				!nested && topLevelClass,
				params.type == 'hflex' ? 'oneput__hflex' : 'oneput__vflex',
				...(params.classes || [])
			]}
			{...params.attr}
		/>
	{:else}
		<svelte:element
			this={params.tag || 'div'}
			id={params.id}
			style={params.style && createStyle(params.style)}
			class={[
				!nested && topLevelClass,
				params.type == 'hflex' ? 'oneput__hflex' : 'oneput__vflex',
				...(params.classes || [])
			]}
			{...params.attr}
		>
			{#if params.children}
				{#each params.children as child}
					{#if child.type === 'hflex'}
						{@render flex(child, true)}
					{:else if child.type === 'vflex'}
						{@render flex(child, true)}
					{:else}
						<FChild {...child as FChildParams} />
					{/if}
				{/each}
			{/if}
		</svelte:element>
	{/if}
{/snippet}

{@render flex(props)}

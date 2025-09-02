<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import FChild from './FChild.svelte';
	import { type FChildParams, type FlexParams } from './lib.js';

	type Props = { class: string } & FlexParams;
	let { class: topLevelClass, focused, shouldScrollIntoView, ...props }: Props = $props();

	function createStyleAttribute(style: Partial<CSSStyleDeclaration>) {
		const browserOnly = globalThis.document;
		if (browserOnly) {
			const tmp = document.createElement('div');
			Object.assign(tmp.style, style);
			return tmp.style.cssText;
		}
	}

	function scrollIntoView(): Attachment {
		return (element) => {
			if (focused && shouldScrollIntoView) {
				const elemRect = element.getBoundingClientRect();
				const containerRect = element.parentElement!.getBoundingClientRect();
				if (elemRect.top < containerRect.top || elemRect.bottom > containerRect.bottom) {
					element.scrollIntoView(false);
				}
			}
		};
	}
</script>

{#snippet flex(params: FlexParams, nested: boolean = false)}
	{#if props.tag === 'hr'}
		<svelte:element
			this={params.tag}
			id={params.id}
			style={params.style && createStyleAttribute(params.style)}
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
			style={params.style && createStyleAttribute(params.style)}
			class={[
				!nested && topLevelClass,
				params.type == 'hflex' ? 'oneput__hflex' : 'oneput__vflex',
				...(params.classes || [])
			]}
			{...params.attr}
			{@attach scrollIntoView()}
		>
			{#if params.children}
				{#each params.children as child (child.id)}
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

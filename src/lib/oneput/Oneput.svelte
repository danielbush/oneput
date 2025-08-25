<script lang="ts">
	import Flex from './Flex.svelte';
	import { type FlexParams, type OneputProps } from './lib.js';
	let { inputElement, menuItemFocus = $bindable(0), ...props }: OneputProps = $props();
	function rewriteAttr(
		index: number,
		attr: FlexParams['attr'],
		action?: FlexParams['action']
	): FlexParams['attr'] {
		const newAttr: FlexParams['attr'] = {
			...attr,
			onpointerenter: (event: Event) => {
				// Inject menu item focus handling...
				menuItemFocus = index;
				// ...then run any client onpointerenter handlers.
				if (typeof attr?.onpointerenter === 'function') {
					attr.onpointerenter(event);
				}
			}
		};
		if (action) {
			newAttr.onpointerdown = (event: Event) => {
				action();
				if (typeof attr?.onpointerdown === 'function') {
					attr.onpointerdown(event);
				}
			};
		}
		return newAttr;
	}
</script>

<div class="oneput__container">
	{#if props.menuOpen}
		<section class="oneput__menu-area">
			{#if props.menu?.header}
				<Flex class="oneput__menu-header" {...props.menu.header} />
			{/if}
			<div class="oneput__menu-body">
				{#each props.menu?.items || [] as item, index (item.id)}
					{#if 'divider' in item && item.divider}
						<Flex class="oneput__menu-divider" {...item} />
					{:else}
						<Flex
							class="oneput__menu-item"
							classes={[index === menuItemFocus && 'oneput__menu-item--focused']}
							{...item}
							attr={rewriteAttr(index, item.attr, item.action)}
						/>
					{/if}
				{/each}
			</div>
			{#if props.menu?.footer}
				<Flex class="oneput__menu-footer" {...props.menu.footer} />
			{/if}
		</section>
	{/if}
	{#if props.inner}
		<section class="oneput__inner-area">
			<Flex class="oneput__inner" {...props.inner} />
		</section>
	{/if}
	{#if props.input}
		<section class="oneput__input-area">
			<!-- Render as an hflex to get default hflex styling. -->
			<div class="oneput__hflex oneput__input-outer">
				{#if props.input?.outerLeft}
					<Flex class="oneput__input-outer-left" {...props.input.outerLeft} />
				{/if}
				<label for="oneput__input" class="oneput__hflex oneput__input-inner">
					{#if props.input?.left}
						<Flex class="oneput__input-left" {...props.input.left} />
					{/if}
					<input
						id="oneput__input"
						bind:this={inputElement}
						value={props.inputValue}
						oninput={props.handleInputChange}
						class="oneput__input"
						type="text"
						placeholder={props.placeholder}
						autocorrect="off"
						autocomplete="off"
						spellcheck="false"
					/>
					{#if props.input?.right}
						<Flex class="oneput__input-right" {...props.input.right} />
					{/if}
				</label>
				{#if props.input?.outerRight}
					<Flex class="oneput__input-outer-right" {...props.input.outerRight} />
				{/if}
			</div>
		</section>
	{/if}
	{#if props.outer}
		<section class="oneput__outer-area">
			<Flex class="oneput__outer" {...props.outer} />
		</section>
	{/if}
</div>

<style>
</style>

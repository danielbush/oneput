<script lang="ts">
	import { createAttachmentKey } from 'svelte/attachments';
	import Flex from './Flex.svelte';
	import { type OneputProps } from '../lib/lib.js';
	import { elasticOut, linear } from 'svelte/easing';

	let {
		inputElement = $bindable(),
		inputValue = $bindable(''),
		menuItemFocus = $bindable([0, true]),
		placeholder = '',
		menuAnimationDuration = 200,
		injectAnimationDuration = 400,
		replaceAnimationDuration = 600,
		...props
	}: OneputProps = $props();

	let inputLines = $derived(Math.max(1, props.inputUI?.inputLines ?? 1));

	$effect(() => {
		props.onMenuOpenChange?.(props.menuOpen ?? false);
	});

	// See UNWANTED_AUTOCOMPLETE
	const autocomplete = 'one-time-code';

	function handleInputChange(evt: Event) {
		// Keep inputValue in sync with what the user typeonInputChange
		inputValue = (evt.target as HTMLInputElement)?.value ?? '';
		// Let the user response to what was typed:
		props.onInputChange?.(evt as InputEvent);
		// Note: the user can set inputValue directly and it will pass down to this component also.
	}

	const scrollIntoView = (index: number) => (element: HTMLElement) => {
		if (index === menuItemFocus[0] && menuItemFocus[1]) {
			const elemRect = element.getBoundingClientRect();
			const containerRect = element.parentElement!.getBoundingClientRect();
			if (elemRect.top < containerRect.top || elemRect.bottom > containerRect.bottom) {
				element.scrollIntoView(false);
			}
		}
	};

	function whoosh(
		node: HTMLElement,
		params: { delay?: number; duration: number; easing?: (t: number) => number }
	) {
		const c = getComputedStyle(node);
		const height = parseInt(c.height);

		return {
			delay: params.delay || 0,
			duration: params.duration,
			easing: params.easing || elasticOut,
			css: (t: number) => `height: ${t * height}px; opacity: ${t};`
		};
	}
</script>

<div
	id="oneput__container"
	class={[
		'oneput__container',
		props.menuOpen && 'oneput__menu--open',
		props.replaceMenuUI?.menu && 'oneput__menu--replaced',
		inputLines > 1 && 'oneput--multiline'
	]}
>
	{#if props.menuOpen || props.replaceMenuUI?.menu}
		<div class="oneput__menu-anchor">
			<section
				in:whoosh={{ duration: menuAnimationDuration, easing: linear }}
				out:whoosh={{ duration: menuAnimationDuration, easing: linear }}
				class="oneput__menu-area"
			>
				{#if props.replaceMenuUI?.menu}
					<section in:whoosh={{ duration: replaceAnimationDuration, easing: elasticOut }}>
						<Flex class="oneput__replace-menu" {...props.replaceMenuUI.menu} />
					</section>
				{:else}
					{#if props.menuUI?.header}
						<Flex class="oneput__menu-header" {...props.menuUI.header} />
					{/if}
					<div class="oneput__menu-body">
						{#each props.menuItems || [] as item, index (item.id)}
							{#if item.ignored}
								<Flex class={item.class ?? ''} {...item} />
							{:else}
								<Flex
									{...item}
									class={item.class ?? 'oneput__menu-item'}
									classes={[
										index === menuItemFocus[0] && `${item.class ?? 'oneput__menu-item'}--focused`,
										...(item.classes ?? [])
									]}
									attr={{
										...item.attr,
										onpointerenter: (event: Event) => {
											props.onMenuItemEnter?.(event, item, index);
											if (typeof item.attr?.onpointerenter === 'function') {
												item.attr.onpointerenter(event);
											}
										},
										onpointerup: (event: Event) => {
											// See POINTER_UP .
											props.onMenuAction?.(event, item, index);
											if (typeof item.attr?.onpointerup === 'function') {
												item.attr.onpointerup(event);
											}
										}
									}}
									attachments={{
										[createAttachmentKey()]: scrollIntoView(index)
									}}
								/>
							{/if}
						{/each}
					</div>
					{#if props.menuUI?.footer}
						<Flex class="oneput__menu-footer" {...props.menuUI.footer} />
					{/if}
				{/if}
			</section>
		</div>
	{/if}
	{#if props.injectUI?.inner}
		<section
			in:whoosh={{ duration: injectAnimationDuration, easing: linear }}
			out:whoosh={{ duration: injectAnimationDuration, easing: linear }}
			class="oneput__inject-area"
		>
			<Flex class="oneput__inject" {...props.injectUI.inner} />
		</section>
	{/if}
	{#if props.innerUI}
		<section class="oneput__inner-area">
			<Flex class="oneput__inner" {...props.innerUI} />
		</section>
	{/if}
	{#if props.inputUI}
		<section class="oneput__input-area">
			<!-- Render as an hflex to get default hflex styling. -->
			<div class="oneput__hflex oneput__input-outer">
				{#if props.inputUI?.outerLeft}
					<Flex class="oneput__input-outer-left" {...props.inputUI.outerLeft} />
				{/if}
				<label for="oneput__input" class="oneput__hflex oneput__input-inner">
					{#if props.inputUI?.left}
						<Flex class="oneput__input-left" {...props.inputUI.left} />
					{/if}
					{#if inputLines === 1}
						<input
							id="oneput__input"
							bind:this={inputElement}
							value={inputValue}
							oninput={handleInputChange}
							class="oneput__input"
							type="text"
							{placeholder}
							autocorrect="off"
							{autocomplete}
							spellcheck="false"
						/>
					{/if}
					{#if inputLines > 1}
						<textarea
							id="oneput__input"
							bind:this={inputElement}
							oninput={handleInputChange}
							class="oneput__input"
							{placeholder}
							rows={inputLines}
							spellcheck="false">{inputValue}</textarea
						>
					{/if}
					{#if props.inputUI?.right}
						<Flex class="oneput__input-right" {...props.inputUI.right} />
					{/if}
				</label>
				{#if props.inputUI?.outerRight}
					<Flex class="oneput__input-outer-right" {...props.inputUI.outerRight} />
				{/if}
			</div>
		</section>
	{/if}
	{#if props.outerUI}
		<section class="oneput__outer-area">
			<Flex class="oneput__outer" {...props.outerUI} />
		</section>
	{/if}
</div>

<style>
</style>

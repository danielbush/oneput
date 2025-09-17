<script lang="ts">
	import { createAttachmentKey } from 'svelte/attachments';
	import Flex from './Flex.svelte';
	import {
		type InputChangeEvent,
		type MenuItem,
		type MenuItemAny,
		type OneputProps
	} from '../lib.js';
	import { fade } from 'svelte/transition';
	let {
		inputElement = $bindable(),
		inputValue = $bindable(''),
		menuItemFocus = $bindable(0),
		menuItemFocusOrigin = $bindable(undefined),
		controller,
		...props
	}: OneputProps = $props();
	function rewriteAttr(
		index: number,
		attr: MenuItemAny['attr'],
		action?: MenuItem['action']
	): MenuItemAny['attr'] {
		const newAttr: MenuItemAny['attr'] = {
			...attr,
			onpointerenter: (event: Event) => {
				// Inject menu item focus handling...
				menuItemFocus = index;
				menuItemFocusOrigin = 'pointer';
				// ...then run any client onpointerenter handlers.
				if (typeof attr?.onpointerenter === 'function') {
					attr.onpointerenter(event);
				}
			}
		};
		if (action) {
			newAttr.onpointerup = (event: Event) => {
				// Run the MenuItem['action'].
				// See POINTER_UP .
				if (controller) {
					action(controller);
				}
				if (typeof attr?.onpointerup === 'function') {
					attr.onpointerup(event);
				}
			};
		}
		return newAttr;
	}

	$effect(() => {
		props.onMenuOpenChange?.(props.menuOpen ?? false);
	});

	// See UNWANTED_AUTOCOMPLETE
	const autocomplete = 'one-time-code';

	function handleInputChange(evt: Event) {
		// Keep inputValue in sync with what the user typeonInputChange
		inputValue = (evt.target as HTMLInputElement)?.value ?? '';
		// Let the user response to what was typed:
		props.onInputChange?.(evt as InputChangeEvent);
		// Note: the user can set inputValue directly and it will pass down to this component also.
	}

	const scrollIntoView = (index: number) => (element: HTMLElement) => {
		if (index === menuItemFocus && menuItemFocusOrigin === 'keyboard') {
			const elemRect = element.getBoundingClientRect();
			const containerRect = element.parentElement!.getBoundingClientRect();
			if (elemRect.top < containerRect.top || elemRect.bottom > containerRect.bottom) {
				element.scrollIntoView(false);
			}
		}
	};
</script>

<div id="oneput__container" class={['oneput__container', props.menuOpen && 'oneput__menu--open']}>
	{#if props.menuOpen}
		<div class="oneput__menu-anchor">
			<section class="oneput__menu-area">
				{#if props.replaceUI?.menu}
					<div in:fade={{ duration: 1000 }}>
						<Flex class="oneput__replace-menu" {...props.replaceUI.menu} />
					</div>
				{:else}
					<div in:fade={{ duration: 1000 }}>
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
											index === menuItemFocus && `${item.class ?? 'oneput__menu-item'}--focused`,
											...(item.classes ?? [])
										]}
										attr={rewriteAttr(index, item.attr, item.action)}
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
					</div>
				{/if}
			</section>
		</div>
	{/if}
	{#if props.injectUI?.inner}
		<section in:fade={{ duration: 1000 }} class="oneput__inject-area">
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
					<input
						id="oneput__input"
						bind:this={inputElement}
						value={inputValue}
						oninput={handleInputChange}
						class="oneput__input"
						type="text"
						placeholder={props.placeholder}
						autocorrect="off"
						{autocomplete}
						spellcheck="false"
					/>
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

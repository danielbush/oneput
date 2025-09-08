<script lang="ts">
	import { commandIcon } from '$lib/ui.js';
	import { hideShowListener } from './lib.js';

	const handleClick = () => {
		window.dispatchEvent(new Event('oneput-toggle-hide'));
	};
</script>

<button
	id="oneput__corner-button"
	title="Hide Oneput"
	type="button"
	onclick={handleClick}
	{@attach hideShowListener(false)}
>
	<!-- eslint-disable svelte/no-at-html-tags -->
	{@html commandIcon}
	<!-- eslint-enable svelte/no-at-html-tags -->
</button>

<style>
	#oneput__corner-button {
		position: fixed;
		bottom: 0;
		right: 0;
		margin: 10px;

		border-radius: 100%;
		padding: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 0;
		color: rgb(100 100 100 / 1);
		background: rgb(240 240 240 / 1);
		border: 1px solid rgb(0 0 0 / 0.3);
		box-shadow: var(--oneput-box-shadow);
		box-shadow: 0px 0px 20px 4px rgb(0 0 0 / 0.3);

		&:hover {
			background: rgb(230 230 230 / 1);
		}
		&:active {
			background: rgb(210 210 210 / 1);
			outline: 3px solid rgb(255 179 2 / 0.5);
		}
		&:focus {
			outline: 3px solid rgb(255 179 2 / 0.5);
		}
	}
</style>

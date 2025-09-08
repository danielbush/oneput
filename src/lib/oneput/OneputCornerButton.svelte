<script lang="ts">
	import { commandIcon } from '$lib/ui.js';
	import type { Attachment } from 'svelte/attachments';

	const { show: showing = false }: { show?: boolean } = $props();

	function listener(): Attachment<HTMLElement> {
		return (btn: HTMLElement) => {
			btn.style.display = showing ? '' : 'none';

			const hide = () => {
				btn.style.display = '';
			};
			const show = () => {
				btn.style.display = 'none';
			};

			window.addEventListener('oneput-hide', hide);
			window.addEventListener('oneput-show', show);
			window.addEventListener('oneput-toggle-hide', () => {
				btn.style.display = btn.style.display === 'none' ? '' : 'none';
			});

			return () => {
				window.removeEventListener('oneput-hide', () => {
					hide();
				});
				window.removeEventListener('oneput-show', () => {
					show();
				});
				window.removeEventListener('oneput-toggle-hide', () => {
					btn.style.display = btn.style.display === 'none' ? '' : 'none';
				});
			};
		};
	}

	const handleClick = () => {
		window.dispatchEvent(new Event('oneput-show'));
	};
</script>

<button id="oneput__corner-button" type="button" onclick={handleClick} {@attach listener()}>
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
		border: 0.5px solid rgb(0 0 0 / 0.5);
		box-shadow: var(--oneput-box-shadow);
		box-shadow: 0px 0px 20px 4px rgb(0 0 0 / 0.3);

		&:hover {
			outline: 1px solid rgb(255 179 2 / 0.5);
			background: rgb(230 230 230 / 1);
		}
		&:active {
			outline: 1px solid rgb(255 179 2 / 0.5);
			background: rgb(210 210 210 / 1);
		}
		&:focus {
			outline: 0.5px solid rgb(255 179 2 / 0.5);
		}
	}
</style>

<script lang="ts">
	import { demoState } from '$lib/demo/state.svelte.js';
</script>

<fieldset>
	<button type="button" onclick={demoState.toggleForceDarkMode}>
		Toggle force dark mode on page
	</button>
</fieldset>

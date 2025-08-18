<script lang="ts">
	import '../../demo-styles.css';
	import { demoState } from '$lib/demo-state.svelte.js';
</script>

<fieldset>
	<button type="button" onclick={demoState.toggleVisualDebug}> Toggle visual debug </button>
	<ul>
		<li>Highlights hflex, vflex and fchild</li>
		<li>
			You can adjust the debug styling in oneput-defaults.css - look for the
			<code>.oneput__debug</code> class.
		</li>
	</ul>
</fieldset>

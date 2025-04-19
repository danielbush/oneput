<!--
See https://svelte.dev/docs/svelte/custom-elements#Component-options .
We'll use no shadow dom so that we can style the oneput classes.
 -->
<svelte:options customElement={{ tag: 'oneput-wc', shadow: 'none' }} />

<script>
	import { Oneput } from 'oneput';
</script>

<Oneput inputValue="foo" placeholder="test" handleInputChange={() => {}} />

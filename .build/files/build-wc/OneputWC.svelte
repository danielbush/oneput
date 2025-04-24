<!--

See https://svelte.dev/docs/svelte/custom-elements in general.

See https://svelte.dev/docs/svelte/custom-elements#Component-options .
We'll use no shadow dom so that we can style the oneput classes.
 -->
<svelte:options customElement={{ tag: 'oneput-wc', shadow: 'none' }} />

<script>
	import { Oneput } from 'oneput';
	// TODO: we have to expose all of Oneput's props here in order for them to be exposed in the webcomponent.
	const { placeholder = 'Type here...' } = $props();
</script>

<Oneput inputValue="foo" {placeholder} handleInputChange={() => {}} />

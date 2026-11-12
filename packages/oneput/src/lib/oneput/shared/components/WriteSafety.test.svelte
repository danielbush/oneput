<script lang="ts">
  import type { Readable } from 'svelte/store';
  import type { FlexRealChild } from '../../types.js';
  import FChild from './FChild.svelte';
  import Flex from './Flex.svelte';
  let { source }: { source: Readable<FlexRealChild> } = $props();
</script>

{#if $source.type === 'fchild'}
  <FChild {...$source} />
{:else}
  <Flex {...$source} class="" />
{/if}

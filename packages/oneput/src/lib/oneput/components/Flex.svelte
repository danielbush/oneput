<script lang="ts">
  import FChild from './FChild.svelte';
  import { randomId, createStyleAttribute } from '../lib/utils.js';
  import { onMount } from 'svelte';
  import type { FChildParams, FlexParams } from '../types.js';

  type Props = { class: string } & FlexParams;
  let { class: topLevelClass, ...props }: Props = $props();

  let node: HTMLElement | null = $state(null);
  onMount(() => {
    if (props.onMount) {
      return props.onMount(node!);
    }
  });
</script>

{#snippet flex(params: FlexParams, nested: boolean = false)}
  {#if props.tag === 'hr'}
    <svelte:element
      this={params.tag}
      id={params.id}
      style={params.style && createStyleAttribute(params.style)}
      class={[
        !nested && topLevelClass,
        params.type == 'hflex' ? 'oneput__hflex' : 'oneput__vflex',
        ...(params.classes || [])
      ]}
      {...params.attr}
    />
  {:else}
    <svelte:element
      this={params.tag || 'div'}
      bind:this={node}
      id={params.id}
      style={params.style && createStyleAttribute(params.style)}
      class={[
        !nested && topLevelClass,
        params.type == 'hflex' ? 'oneput__hflex' : 'oneput__vflex',
        ...(params.classes || [])
      ]}
      {...params.attr}
      {...params.attachments}
    >
      {#if params.children}
        <!-- Hack: Have to use randomId() in the case of 2 undefined
			children otherwise even though they won't get rendered we will still
			trigger svelte's dupliate key error and get a whitescreen because 2
			keys both have undefined as the id. -->
        {#each params.children as child ((child && child.id) || randomId())}
          {#if child}
            {#if child.type === 'hflex'}
              {@render flex(child, true)}
            {:else if child.type === 'vflex'}
              {@render flex(child, true)}
            {:else}
              <FChild {...child as FChildParams} />
            {/if}
          {/if}
        {/each}
      {/if}
    </svelte:element>
  {/if}
{/snippet}

{@render flex(props)}

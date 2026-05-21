<!-- typescript infers R based on the `run` prop's return type which allows us
to infer R from the particular AppObject it returns.  This is similar to a
function generic type inferred from its arguments. -->
<script lang="ts" generics="R = unknown">
  // Wraps Oneput and creates and exposes a controller that lets you
  // programmatically control Oneput.
  import Oneput from './Oneput.svelte';
  import { Controller } from '../../controllers/controller.js';
  import { onMount } from 'svelte';
  import type { AppObject, OneputProps } from '../../types.js';

  let inputElement: HTMLInputElement | undefined = $state(undefined);
  const currentProps = $state<OneputProps>({
    menuItemFocus: [0, true],
    inputValue: '',
    placeholder: 'Type here...',
    onInputChange: () => {},
    menuItems: [],
    menuOpen: false
  });
  const props: { run: (ctl: Controller) => AppObject<R> } = $props();

  const controller = Controller.create(currentProps);

  $effect(() => {
    controller.input.handleInputElementChange(inputElement);
  });

  onMount(() => {
    controller.app.run(props.run(controller));
  });
</script>

<Oneput
  {...currentProps}
  bind:inputValue={currentProps.inputValue}
  bind:inputElement
  bind:menuItemFocus={currentProps.menuItemFocus}
/>

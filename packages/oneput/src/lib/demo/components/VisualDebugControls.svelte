<script lang="ts">
  import { demoState } from '../state.svelte.js';
</script>

<fieldset class="demo">
  <button type="button" onclick={demoState.toggleVisualDebug}> Toggle visual debug </button>
  <ul>
    <li>Highlights hflex, vflex and fchild</li>
    <li>
      You can adjust the debug styling in oneput-defaults.css - look for the
      <code>.oneput__debug</code> class.
    </li>
  </ul>
</fieldset>

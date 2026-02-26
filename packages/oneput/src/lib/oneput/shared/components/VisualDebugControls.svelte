<script lang="ts">
  let visualDebug = $state(false);

  function toggleVisualDebug() {
    visualDebug = !visualDebug;
    if (visualDebug) {
      document.documentElement.classList.add('oneput__debug');
    } else {
      document.documentElement.classList.remove('oneput__debug');
    }
  }
</script>

<fieldset class="demo">
  <button type="button" onclick={toggleVisualDebug}> Toggle visual debug </button>
  <ul>
    <li>Highlights hflex, vflex and fchild</li>
    <li>
      You can adjust the debug styling in oneput-defaults.css - look for the
      <code>.oneput__debug</code> class.
    </li>
  </ul>
</fieldset>

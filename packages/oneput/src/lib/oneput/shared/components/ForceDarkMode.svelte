<script lang="ts">
  let forceDarkMode = $state(false);

  function toggleForceDarkMode() {
    forceDarkMode = !forceDarkMode;
    if (forceDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }
</script>

<fieldset class="demo">
  <button type="button" onclick={toggleForceDarkMode}> Toggle force dark mode on page </button>
</fieldset>

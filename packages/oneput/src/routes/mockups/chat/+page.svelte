<script lang="ts">
  import '../../_demo-styles.css';
  import './_chat-styles.css';
  import '$lib/oneput/shared/styles/oneput-defaults.css';
  import Oneput from '$lib/oneput/shared/components/Oneput.svelte';
  import * as ui from '../../_ui.js';
  import { resolve } from '$app/paths';
  import * as mockups from './_chat.js';
  import VisualDebugControls from '$lib/oneput/shared/components/VisualDebugControls.svelte';
  import ForceDarkModeControls from '$lib/oneput/shared/components/ForceDarkMode.svelte';
</script>

<svelte:head>
  <!-- IOS_CLICK_ZOOM -->
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<main>
  <p><a href={resolve('/')}>&larr; Back to visual states</a></p>
  <h1>Chat mockups</h1>
  <p>Three transcript shapes built from existing primitives.</p>
  <VisualDebugControls />
  <ForceDarkModeControls />

  <br />

  <section class="demo-grid">
    <section class="demo-example">
      <h2>Chat transcript</h2>
      <p>
        Messages are <code>ignored</code> blocks alternating alignment via <code>alignSelf</code> — no
        new focus machinery needed. The trailing suggestion is actionable, so Up/Down skips the prose
        and lands straight on it. What is missing is scroll anchoring: the menu body only scrolls when
        focus moves, so an appended message will not stick to the bottom.
      </p>
      <Oneput
        menuOpen={true}
        menuItems={mockups.chatMenuItems()}
        menuUI={{ layoutHeader: mockups.chatHeader }}
        inputUI={{
          textArea: { rows: 2 },
          left: ui.inputLeft1,
          right: ui.inputRight1
        }}
        placeholder="Reply..."
        inputValue=""
      />
    </section>

    <section class="demo-example">
      <h2>Chat (grow-only transcript)</h2>
      <p>
        Messages stay <code>ignored</code>; suggestions and Clear are normal items. No inner focus —
        chat likely needs none of the calendar key machinery.
      </p>
      <Oneput
        menuOpen={true}
        menuItems={mockups.richChatMenuItems()}
        menuUI={{ layoutHeader: mockups.chatHeader }}
        inputUI={{
          textArea: { rows: 2 },
          left: ui.inputLeft1,
          right: ui.inputRight1
        }}
        placeholder="Reply..."
        inputValue=""
      />
    </section>

    <section class="demo-example">
      <h2>Chat (scrollable item)</h2>
      <p>
        Transcript is one rich item with a top-right jump button and its own
        <code>overflow-y</code> pane; extra sibling rows force the menu body to scroll too.
      </p>
      <Oneput
        menuOpen={true}
        menuItems={mockups.richChatScrollMenuItems()}
        menuUI={{ layoutHeader: mockups.chatHeader }}
        inputUI={{
          textArea: { rows: 2 },
          left: ui.inputLeft1,
          right: ui.inputRight1
        }}
        placeholder="Reply..."
        inputValue=""
      />
    </section>
  </section>
</main>

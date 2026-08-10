<script lang="ts">
  import './_demo-styles.css';
  import '$lib/oneput/shared/styles/oneput-defaults.css';
  import Oneput from '$lib/oneput/shared/components/Oneput.svelte';
  import * as data from './_state.js';
  import * as ui from './_ui.js';
  import { icons } from './_state.svelte.js';
  import VisualDebugControls from '$lib/oneput/shared/components/VisualDebugControls.svelte';
  import ForceDarkModeControls from '$lib/oneput/shared/components/ForceDarkMode.svelte';
  import { randomId } from '$lib/oneput/lib/utils.js';
  import { tinykeys } from 'tinykeys';
  import { resolve } from '$app/paths';

  const oneputState = $state({
    menuOpen: false
  });

  // Global keybindings

  $effect(() => {
    tinykeys(document.body, {
      '$mod+k': () => {
        oneputState.menuOpen = !oneputState.menuOpen;
      }
    });
  });

  // Oneput keybindings

  $effect(() => {
    tinykeys(document.body, {
      'control+n': () => {
        //
      }
    });
  });

  let toggleConfirm = $state(true);
  let toggleAlert = $state(true);
  let toggleNotification = $state(true);
</script>

<svelte:head>
  <!-- IOS_CLICK_ZOOM -->
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<main>
  <h1>Oneput Visual States</h1>
  <p>Demo visual states for Oneput component</p>
  <nav>
    <p>More pages:</p>
    <ul>
      <li><a href={resolve('/stdMenuItem')}>stdMenuItem (+ skeleton)</a></li>
      <li><a href={resolve('/mockups/calendar')}>Mockup: calendar (two ways)</a></li>
      <li><a href={resolve('/mockups/time')}>Mockup: time</a></li>
      <li><a href={resolve('/mockups/chat')}>Mockup: chat</a></li>
      <li><a href={resolve('/mockups/breadcrumb')}>Mockup: breadcrumb</a></li>
    </ul>
  </nav>
  <VisualDebugControls />
  <ForceDarkModeControls />

  <br />

  <section class="demo-grid">
    <section class="demo-example">
      <h2>Everything showing</h2>
      {#snippet demo1(menuOpen: boolean)}
        <Oneput
          {menuOpen}
          menuItems={ui.menuItems1()}
          menuUI={{
            layoutHeader: ui.menuHeader1,
            layoutFooter: ui.menuFooter1(data.appState.zap)
          }}
          innerUI={ui.inner1}
          outerUI={ui.outer1(data.appState.zap)}
          inputUI={{
            left: ui.inputLeft1,
            right: ui.inputRight1,
            outerLeft: ui.inputOuterLeft1,
            outerRight: ui.inputOuterRight1
          }}
          placeholder="Placeholder..."
          inputValue=""
          onInputChange={() => {
            console.log('onInputChange');
          }}
        />
      {/snippet}
      {@render demo1(false)}
      <p>Menu open</p>
      {@render demo1(true)}
    </section>

    <section class="demo-example">
      <h2>Minimal</h2>
      {#snippet demo1(menuOpen: boolean)}
        <Oneput
          {menuOpen}
          menuItems={ui.menuItems1()}
          inputUI={{}}
          placeholder="Placeholder..."
          inputValue=""
          onInputChange={() => {
            console.log('onInputChange');
          }}
        />
      {/snippet}
      {@render demo1(false)}
      <p>Menu open</p>
      {@render demo1(true)}
    </section>
    <section class="demo-example">
      <h2>Alert</h2>
      <button onclick={() => (toggleAlert = !toggleAlert)}>Toggle Alert</button>
      <Oneput
        menuOpen={true}
        menuItems={ui.menuItems1()}
        replaceMenuUI={toggleAlert
          ? undefined
          : {
              menu: {
                id: 'alert',
                type: 'vflex',
                classes: ['oneput__menu-body-content'],
                children: [
                  {
                    id: 'alert-title',
                    type: 'fchild',
                    htmlContentUnsafe: '<h2>Alert Title!</h2>'
                  },
                  {
                    id: 'alert-message',
                    type: 'fchild',
                    htmlContentUnsafe: '<p>This is the sentence below the alert title.</p>'
                  },
                  {
                    id: 'alert-button',
                    type: 'fchild',
                    tag: 'button',
                    classes: ['oneput__primary-button'],
                    textContent: 'OK',
                    attr: {
                      onclick: () => {
                        toggleAlert = true;
                      }
                    }
                  }
                ]
              }
            }}
        inputUI={{
          left: ui.inputLeft1,
          right: ui.inputRight1,
          outerLeft: ui.inputOuterLeft1,
          outerRight: ui.inputOuterRight1
        }}
        placeholder="Type enter to continue..."
        inputValue=""
        onInputChange={() => {
          console.log('onInputChange');
        }}
      />
    </section>
    <section class="demo-example">
      <h2>Confirm</h2>
      <button onclick={() => (toggleConfirm = !toggleConfirm)}>Toggle Confirm</button>
      <Oneput
        menuOpen={true}
        menuItems={ui.menuItems1()}
        replaceMenuUI={toggleConfirm
          ? undefined
          : {
              menu: {
                id: 'alert',
                type: 'vflex',
                classes: ['oneput__menu-body-content'],
                children: [
                  {
                    id: 'alert-title',
                    type: 'fchild',
                    htmlContentUnsafe: '<h2>Confirm?</h2>'
                  },
                  {
                    id: 'alert-message',
                    type: 'fchild',
                    htmlContentUnsafe: '<p>This is the sentence below the confirm title.</p>'
                  },
                  {
                    id: 'confirm-button-group',
                    type: 'hflex',
                    style: { gap: '1rem' },
                    children: [
                      {
                        id: 'confirm-yes-button',
                        type: 'fchild',
                        tag: 'button',
                        classes: ['oneput__primary-button'],
                        textContent: 'Yes',
                        attr: {
                          onclick: () => {
                            toggleConfirm = true;
                          }
                        }
                      },
                      {
                        id: 'confirm-no-button',
                        type: 'fchild',
                        tag: 'button',
                        classes: ['oneput__primary-button'],
                        textContent: 'No',
                        attr: {
                          onclick: () => {
                            toggleConfirm = true;
                          }
                        }
                      }
                    ]
                  }
                ]
              }
            }}
        inputUI={{
          left: ui.inputLeft1,
          right: ui.inputRight1,
          outerLeft: ui.inputOuterLeft1,
          outerRight: ui.inputOuterRight1
        }}
        placeholder="Type y or n..."
        inputValue=""
        onInputChange={() => {
          console.log('onInputChange');
        }}
      />
    </section>
    <section class="demo-example">
      <h2>Notification</h2>
      <button onclick={() => (toggleNotification = !toggleNotification)}>Toggle Notification</button
      >
      <Oneput
        menuOpen={true}
        menuItems={ui.menuItems1()}
        injectUI={toggleNotification
          ? undefined
          : {
              inner: {
                id: randomId(),
                type: 'hflex',
                classes: ['oneput__notification'],
                style: { width: '100%' },
                children: [
                  {
                    id: randomId(),
                    type: 'fchild',
                    textContent: 'This is a notification'
                  },
                  {
                    id: randomId(),
                    type: 'fchild',
                    classes: ['oneput__icon-button'],
                    icon: icons.X,
                    attr: {
                      onclick: () => {
                        toggleNotification = true;
                      }
                    }
                  }
                ]
              }
            }}
        inputUI={{
          left: ui.inputLeft1,
          right: ui.inputRight1,
          outerLeft: ui.inputOuterLeft1,
          outerRight: ui.inputOuterRight1
        }}
        placeholder="Type y or n..."
        inputValue=""
        onInputChange={() => {
          console.log('onInputChange');
        }}
      />
    </section>
    <section class="demo-example">
      <h2>Textarea (multiline)</h2>
      <Oneput
        menuOpen={false}
        menuItems={ui.menuItems1()}
        inputUI={{
          textArea: { rows: 5 },
          left: ui.inputLeft1,
          right: ui.inputRight1,
          outerLeft: ui.inputOuterLeft1,
          outerRight: ui.inputOuterRight1
        }}
        placeholder="Type multiple lines..."
        inputValue=""
        onInputChange={() => {
          console.log('onInputChange');
        }}
      />
    </section>
  </section>
</main>

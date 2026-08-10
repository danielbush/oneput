<script lang="ts">
  import '../_demo-styles.css';
  import '$lib/oneput/shared/styles/oneput-defaults.css';
  import Oneput from '$lib/oneput/shared/components/Oneput.svelte';
  import { resolve } from '$app/paths';
  import { icons } from '../_state.svelte.js';
  import { stdMenuItem } from '$lib/oneput/shared/ui/menuItems/stdMenuItem.js';
  import { stdSkeletonMenuItems } from '$lib/oneput/shared/ui/menuItems/stdSkeletonMenuItems.js';
  import VisualDebugControls from '$lib/oneput/shared/components/VisualDebugControls.svelte';
  import ForceDarkModeControls from '$lib/oneput/shared/components/ForceDarkMode.svelte';
</script>

<svelte:head>
  <!-- IOS_CLICK_ZOOM -->
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<main>
  <p><a href={resolve('/')}>&larr; Back to visual states</a></p>
  <h1>Menu items</h1>
  <p>The <code>stdMenuItem</code> template and the skeleton loader.</p>
  <VisualDebugControls />
  <ForceDarkModeControls />

  <br />

  <section class="demo-grid">
    <section class="demo-example demo-buttons">
      <h2>stdMenuItem</h2>
      <p>
        This template function handles a wide variety of menu item appearances. It's just a
        convenience so you don't have to keep writing the same flex/child data-structures. You can
        of course build your own to suit your needs.
      </p>
      <Oneput
        menuOpen={true}
        menuItems={[stdMenuItem({ textContent: 'No left icons space...', left: false })]}
      />
      <Oneput
        menuOpen={true}
        menuItems={[
          stdMenuItem({
            textContent:
              'No left+right space. This is a very long line that should get cut off with an ellipsis but does it, lets see.' +
              'This is a very long line that should get cut off with an ellipsis but does it, lets see.',
            left: false,
            right: false
          })
        ]}
      />
      <Oneput menuOpen={true} menuItems={[stdMenuItem({ textContent: 'No icons...' })]} />
      <Oneput
        menuOpen={true}
        menuItems={[
          stdMenuItem({
            textContent:
              'This is a very long line that should get cut off with an ellipsis but does it, lets see.' +
              'This is a very long line that should get cut off with an ellipsis but does it, lets see.'
          })
        ]}
      />
      <Oneput
        menuOpen={true}
        menuItems={[
          stdMenuItem({
            left: (b) => [b.icon(icons.Search)],
            textContent: 'Left icon only...'
          })
        ]}
      />
      <Oneput
        menuOpen={true}
        menuItems={[
          stdMenuItem({
            left: (b) => [b.icon(icons.Search)],
            textContent: 'Both left + right icons...',
            right: (b) => [b.icon(icons.ChevronRight)]
          })
        ]}
      />
      <Oneput
        menuOpen={true}
        menuItems={[
          stdMenuItem({
            left: (b) => [b.icon(icons.Search)],
            textContent: 'Left + multiple right icons...',
            right: (b) => [
              b.iconButton(icons.Play, { title: 'Play' }),
              b.iconButton(icons.Pause, { title: 'Pause' }),
              b.iconButton(icons.Square, { title: 'Stop' })
            ]
          })
        ]}
      />
      <Oneput
        menuOpen={true}
        menuItems={[
          stdMenuItem({
            left: (b) => [b.icon(icons.Search)],
            textContent: 'Left + right (kbd) ...',
            right: (b) => [
              b.fchild({
                style: { flex: '0' },
                innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
                classes: ['oneput__kbd']
              }),
              b.icon(icons.ChevronRight)
            ]
          })
        ]}
      />
      <Oneput
        menuOpen={true}
        menuItems={[
          stdMenuItem({
            left: (b) => [b.icon(icons.Search)],
            textContent: 'Left + right + innerBottom section...',
            right: (b) => [b.icon(icons.ChevronRight)],
            bottom: {
              textContent: 'Here is a more detailed description.'
            }
          })
        ]}
      />
      <Oneput
        menuOpen={true}
        menuItems={[
          stdMenuItem({
            left: (b) => [b.icon(icons.Search)],
            textContent: 'Left + right + right + bottom...',
            right: (b) => [
              b.iconButton(icons.Play, {
                title: 'Play',
                innerHTMLUnsafe: '<i data-lucide="play"></i>'
              }),
              b.iconButton(icons.Pause, {
                title: 'Pause',
                innerHTMLUnsafe: '<i data-lucide="pause"></i>'
              }),
              b.iconButton(icons.Square, {
                title: 'Stop',
                innerHTMLUnsafe: '<i data-lucide="square"></i>'
              }),
              b.icon(icons.ChevronRight)
            ],
            bottom: {
              textContent: 'Here is a more detailed description.'
            }
          })
        ]}
      />
      <Oneput
        menuOpen={true}
        menuItems={[
          stdMenuItem({
            left: (b) => [b.icon(icons.Search)],
            textContent: 'Left + right (kbd) + bottom...',
            right: (b) => [
              b.fchild({
                style: { flex: '0' },
                innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
                classes: ['oneput__kbd']
              }),
              b.icon(icons.ChevronRight)
            ],
            bottom: {
              textContent:
                'This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item.'
            }
          })
        ]}
      />
      <Oneput
        menuOpen={true}
        menuItems={[
          stdMenuItem({
            left: (b) => [b.icon(icons.Search)],
            textContent: 'Left + right + bottom (left)...',
            right: (b) => [
              b.fchild({
                style: { flex: '0' },
                innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
                classes: ['oneput__kbd']
              }),
              b.spacer()
            ],
            bottom: {
              left: (b) => [b.icon(icons.Info)],
              textContent:
                'This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item.'
            }
          })
        ]}
      />
      <Oneput
        menuOpen={true}
        menuItems={[
          stdMenuItem({
            left: (b) => [b.icon(icons.Search)],
            textContent: 'Left + right + bottom (left + right)...',
            right: (b) => [
              b.fchild({
                style: { flex: '0' },
                innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
                classes: ['oneput__kbd']
              }),
              b.spacer()
            ],
            bottom: {
              left: (b) => [b.icon(icons.Info)],
              textContent:
                'This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item.',
              right: (b) => [
                b.iconButton(icons.EllipsisVertical, {
                  title: 'More...'
                })
              ]
            }
          })
        ]}
      />
      <Oneput
        menuOpen={true}
        menuItems={[
          stdMenuItem({
            left: (b) => [b.icon(icons.Search)],
            textContent: 'No bottom (left + right)...',
            right: (b) => [
              b.fchild({
                style: { flex: '0' },
                innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
                classes: ['oneput__kbd']
              }),
              b.spacer()
            ],
            bottom: {
              left: false,
              textContent:
                'This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item.',
              right: false
            }
          })
        ]}
      />
      <Oneput
        menuOpen={true}
        menuItems={[
          stdMenuItem({
            left: false,
            textContent: 'No Left + no bottom (left + right)...',
            right: (b) => [
              b.fchild({
                style: { flex: '0' },
                innerHTMLUnsafe: '<code><kbd>Ctrl</kbd><kbd>x</kbd></code>',
                classes: ['oneput__kbd']
              })
            ],
            bottom: {
              left: false,
              textContent:
                'This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item. This is some sort of description for this menu item.',
              right: false
            }
          })
        ]}
      />
    </section>
    <section class="demo-example">
      <h2>Skeleton loader (stdMenuItem)</h2>
      <p>Placeholder rows shown while menu items load.</p>
      <Oneput
        menuOpen={true}
        menuItems={stdSkeletonMenuItems()}
        placeholder="Loading..."
        inputValue=""
      />
    </section>
  </section>
</main>

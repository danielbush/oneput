import { describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Oneput from './Oneput.svelte';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';

describe('Oneput menu pointer activation', () => {
  test('runs item pointer handling on pointerup and the menu action on click', () => {
    // arrange
    const events: string[] = [];
    const item = stdMenuItem({
      id: 'target',
      textContent: 'Target',
      action: () => {},
      attr: {
        onpointerup: () => events.push('item pointerup'),
        onclick: () => events.push('item click')
      }
    });
    render(Oneput, {
      menuOpen: true,
      menuAnimationDuration: 0,
      menuItems: [item],
      onMenuAction: () => events.push('menu action')
    });
    const target = document.querySelector<HTMLElement>('#target')!;

    // act
    target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    // assert
    expect(events).toEqual(['item pointerup']);

    // act
    target.click();

    // assert
    expect(events).toEqual(['item pointerup', 'menu action', 'item click']);
  });
});

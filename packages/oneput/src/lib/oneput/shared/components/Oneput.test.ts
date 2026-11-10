import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, test } from 'vitest';
import type { OneputProps } from '../../types.js';
import Oneput from './Oneput.svelte';

const mounted: Array<Record<string, unknown>> = [];
afterEach(() => {
  mounted.splice(0).forEach((component) => unmount(component));
  document.body.innerHTML = '';
});

/** Mount `Oneput` with `props` in the document. */
function render(props: OneputProps) {
  mounted.push(mount(Oneput, { target: document.body, props }));
  flushSync();
}
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
    render({
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

describe('Oneput input kind', () => {
  test('password - an input of type password', () => {
    // arrange
    render({ menuOpen: false, inputUI: { input: { kind: 'password' } } });

    // act
    const input = document.querySelector('#oneput__input')!;

    // assert
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('type')).toBe('password');
  });

  test('textarea - a textarea with its rows', () => {
    // arrange
    render({ menuOpen: false, inputUI: { input: { kind: 'textarea', rows: 3 } } });

    // act
    const input = document.querySelector('#oneput__input')!;

    // assert
    expect(input.tagName).toBe('TEXTAREA');
    expect(input.getAttribute('rows')).toBe('3');
  });

  test('no input - a text input', () => {
    // arrange
    render({ menuOpen: false, inputUI: {} });

    // act
    const input = document.querySelector('#oneput__input')!;

    // assert
    expect(input.getAttribute('type')).toBe('text');
  });
});

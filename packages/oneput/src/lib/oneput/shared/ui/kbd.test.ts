import { describe, expect, test } from 'vitest';
import { bindingToKbdHtml } from './kbd.js';

const SYMBOL = ' class="oneput__kbd-symbol"';

describe('bindingToKbdHtml', () => {
  test('$mod+Enter on mac', () => {
    // arrange / act / assert
    expect(bindingToKbdHtml('$mod+Enter', true)).toBe(
      `<code><kbd${SYMBOL}>⌘</kbd><kbd>Enter</kbd></code>`
    );
  });

  test('$mod+Enter on windows/linux', () => {
    expect(bindingToKbdHtml('$mod+Enter', false)).toBe(
      '<code><kbd>Ctrl</kbd><kbd>Enter</kbd></code>'
    );
  });

  test('Control+Shift+k on windows/linux', () => {
    expect(bindingToKbdHtml('Control+Shift+k', false)).toBe(
      `<code><kbd>Ctrl</kbd><kbd${SYMBOL}>⇧</kbd><kbd>k</kbd></code>`
    );
  });

  test('Control+Shift+k on mac', () => {
    expect(bindingToKbdHtml('Control+Shift+k', true)).toBe(
      `<code><kbd${SYMBOL}>⌃</kbd><kbd${SYMBOL}>⇧</kbd><kbd>k</kbd></code>`
    );
  });

  test('only glyphs get the symbol class', () => {
    expect(bindingToKbdHtml('Alt+z', false)).toBe('<code><kbd>Alt</kbd><kbd>z</kbd></code>');
  });
});

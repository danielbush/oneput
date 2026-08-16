import { describe, expect, test } from 'vitest';
import { bindingToKbdHtml } from './kbd.js';

describe('bindingToKbdHtml', () => {
  test('$mod+Enter on mac', () => {
    // arrange / act / assert
    expect(bindingToKbdHtml('$mod+Enter', true)).toBe('<code><kbd>⌘</kbd><kbd>Enter</kbd></code>');
  });

  test('$mod+Enter on windows/linux', () => {
    expect(bindingToKbdHtml('$mod+Enter', false)).toBe(
      '<code><kbd>Ctrl</kbd><kbd>Enter</kbd></code>'
    );
  });

  test('Control+Shift+k', () => {
    expect(bindingToKbdHtml('Control+Shift+k', false)).toBe(
      '<code><kbd>Ctrl</kbd><kbd>⇧</kbd><kbd>k</kbd></code>'
    );
  });
});

import { describe, expect, test } from 'vitest';
import { DARK_MODE_CLASS, followSystemColorScheme, SystemColorScheme } from '../colorScheme.js';

describe('followSystemColorScheme', () => {
  test('sets dark mode when the OS is dark', () => {
    // arrange
    const root = document.createElement('html');

    // act
    followSystemColorScheme(root, SystemColorScheme.createNull({ dark: true }));

    // assert
    expect(root.classList.contains(DARK_MODE_CLASS)).toBe(true);
  });

  test('follows the OS setting as it changes', () => {
    // arrange
    const root = document.createElement('html');
    const scheme = SystemColorScheme.createNull({ dark: false });
    followSystemColorScheme(root, scheme);
    expect(root.classList.contains(DARK_MODE_CLASS)).toBe(false);

    // act
    scheme.simulateChange(true);

    // assert
    expect(root.classList.contains(DARK_MODE_CLASS)).toBe(true);

    // act
    scheme.simulateChange(false);

    // assert
    expect(root.classList.contains(DARK_MODE_CLASS)).toBe(false);
  });

  test('stops following when stopped', () => {
    // arrange
    const root = document.createElement('html');
    const scheme = SystemColorScheme.createNull({ dark: false });
    const stop = followSystemColorScheme(root, scheme);

    // act
    stop();
    scheme.simulateChange(true);

    // assert
    expect(root.classList.contains(DARK_MODE_CLASS)).toBe(false);
  });
});

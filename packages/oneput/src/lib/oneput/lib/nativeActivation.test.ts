import { describe, expect, test } from 'vitest';
import { isNativeActivation } from './nativeActivation.js';

const keyEvent = (key: string, target: EventTarget, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, ...init });
  target.dispatchEvent(event);
  return event;
};

const element = (tag: string, attributes: Record<string, string> = {}) => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, value);
  }
  document.body.append(node);
  return node;
};

describe('isNativeActivation', () => {
  test('Enter on a button', () => {
    // arrange
    const button = element('button');

    // act
    const result = isNativeActivation(keyEvent('Enter', button));

    // assert
    expect(result).toBe(true);
  });

  test('Space on a button', () => {
    // arrange
    const button = element('button');

    // act
    const result = isNativeActivation(keyEvent(' ', button));

    // assert
    expect(result).toBe(true);
  });

  test('Shift+Enter on a button - the browser also activates', () => {
    // arrange
    const button = element('button');

    // act
    const result = isNativeActivation(keyEvent('Enter', button, { shiftKey: true }));

    // assert
    expect(result).toBe(true);
  });

  test('$mod+Enter on a button - a modifier binding still fires', () => {
    // arrange
    const button = element('button');

    // act
    const result = isNativeActivation(keyEvent('Enter', button, { metaKey: true }));

    // assert
    expect(result).toBe(false);
  });

  test('Enter on the text input', () => {
    // arrange
    const input = element('input', { type: 'text' });

    // act
    const result = isNativeActivation(keyEvent('Enter', input));

    // assert
    expect(result).toBe(false);
  });

  test('Enter on a textarea', () => {
    // arrange
    const textarea = element('textarea');

    // act
    const result = isNativeActivation(keyEvent('Enter', textarea));

    // assert
    expect(result).toBe(false);
  });

  test('Enter on a checkbox', () => {
    // arrange
    const checkbox = element('input', { type: 'checkbox' });

    // act
    const result = isNativeActivation(keyEvent('Enter', checkbox));

    // assert
    expect(result).toBe(true);
  });

  test('Enter on an anchor with href', () => {
    // arrange
    const anchor = element('a', { href: '#x' });

    // act
    const result = isNativeActivation(keyEvent('Enter', anchor));

    // assert
    expect(result).toBe(true);
  });

  test('Enter on an anchor without href', () => {
    // arrange
    const anchor = element('a');

    // act
    const result = isNativeActivation(keyEvent('Enter', anchor));

    // assert
    expect(result).toBe(false);
  });

  test('other keys on a button', () => {
    // arrange
    const button = element('button');

    // act
    const result = isNativeActivation(keyEvent('j', button));

    // assert
    expect(result).toBe(false);
  });

  test('Enter on window', () => {
    // act
    const result = isNativeActivation(keyEvent('Enter', window));

    // assert
    expect(result).toBe(false);
  });
});

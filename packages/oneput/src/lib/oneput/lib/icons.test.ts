import { describe, expect, test } from 'vitest';
import { element, getIconRenderer, registerIcons } from './icons.js';

describe('icon registration', () => {
  test('renderers return their registered names', () => {
    // arrange
    const renderer = (target: HTMLElement) => {
      target.textContent = 'rendered';
    };

    // act
    const icons = registerIcons(
      { TestRenderer: renderer },
      (registeredRenderer) => registeredRenderer
    );
    const target = document.createElement('div');
    getIconRenderer(icons.TestRenderer)?.(target);

    // assert
    expect(icons).toEqual({ TestRenderer: 'TestRenderer' });
    expect(target.textContent).toBe('rendered');
  });

  test('element factories return names and render elements', () => {
    // arrange
    const iconData = {
      TestElement: () => document.createElement('span')
    };

    // act
    const icons = registerIcons(iconData, (createIcon) => element(createIcon));
    const target = document.createElement('div');
    getIconRenderer(icons.TestElement)?.(target);

    // assert
    expect(icons).toEqual({ TestElement: 'TestElement' });
    expect(target.firstElementChild?.tagName).toBe('SPAN');
  });
});

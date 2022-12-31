/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { describe, expect, test } from '@jest/globals';
import { JSDOM } from 'jsdom';
import List from '../list';
// import jsdom

describe('list navigator', () => {
  it('can focus on the list', () => {
    // Arrange
    const dom = new JSDOM(
      `<!DOCTYPE html><body><ul><li>item 1</li><li>item 2</li></ul></body>`,
    );
    const [body] = dom.window.document.getElementsByTagName('body');
    const ul = body.firstChild as HTMLElement;

    // Act
    const list = new List(ul);

    // Assert
    expect(ul.classList).toContain('sbr-focus');
  });

  it('can move focus to any item on the list', () => {
    //
  });
});

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { load } from '../index';

describe('loading', () => {
  it('can load the document', () => {
    // Arrange
    const dom = new JSDOM(
      `<!DOCTYPE html><body><ul><li>item 1</li><li>item 2</li></ul></body>`,
    );
    const [body] = dom.window.document.getElementsByTagName('body');

    // Act
    load(body);
  });

  it('will focus on the first Element by default', () => {
    // Arrange
    const dom = new JSDOM(
      `<!DOCTYPE html><body><ul><li>item 1</li><li>item 2</li></ul></body>`,
    );
    // const [body] = dom.window.document.getElementsByTagName('body');
    const body = dom.window.document.querySelector('body')!;

    // Act
    load(body);

    // Assert
    const ul = body.querySelector('ul')!;
    expect(Array.from(ul.classList)).toEqual(['sbr-focus']);
  });
});

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { load } from '../index';

function makeDoc(content: string): string {
  return `<!DOCTYPE html><body>${content}</body>`;
}

const EXAMPLE = {
  simpleList: makeDoc('<ul><li>item 1</li><li>item 2</li></ul>'),
};

describe('loading', () => {
  it('can load the document', () => {
    // Arrange
    const dom = new JSDOM(EXAMPLE.simpleList);
    const body = dom.window.document.querySelector('body')!;

    // Act
    load(body);
  });

  it('will focus on the first Element by default', () => {
    // Arrange
    const dom = new JSDOM(EXAMPLE.simpleList);
    const body = dom.window.document.querySelector('body')!;

    // Act
    load(body);

    // Assert
    const ul = body.querySelector('ul')!;
    expect(Array.from(ul.classList)).toEqual(['sbr-focus']);
    expect(ul.getAttribute('tabindex')).toEqual('0');
  });
});

describe('loaded', () => {
  it('lets me focus on content in source order by tab', () => {
    // Arrange - load a list and focus on it
    const dom = new JSDOM(EXAMPLE.simpleList);
    const body = dom.window.document.querySelector('body')!;
    load(body);
    const ul = body.querySelector('ul')!;

    // Act
    // fire tab event, check element, repeat
    throw new Error('todo');
  });

  it.todo('should focus an element if I touch or click it');
  it.todo('lets me focus on first child by key eg vim keys');
  it.todo('lets me focus on next sibling');
});

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

  it.todo('does not navigate script elements');
  it.todo('should navigate into chidren first before siblings');
});

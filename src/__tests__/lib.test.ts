/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { load, serialize } from '../lib';

function makeDoc(content: string): string {
  return `<!DOCTYPE html><body>${content}</body>`;
}

const EXAMPLE = {
  simpleList: makeDoc('<ul><li>item 1</li><li>item 2</li></ul>'),
};

/**
 * globalThis.window.HTMLElement etc !== dom.window.HTMLElement (jsdom)
 * https://stackoverflow.com/questions/40449434/mocking-globals-in-jest
 */
function mockWindow(dom: JSDOM) {
  const jsdomWindow = dom.window;
  Object.defineProperty(global, 'window', {
    value: jsdomWindow,
    writable: true,
  });
}

describe('loader', () => {
  it('can load the document', () => {
    // arrange
    const dom = new JSDOM(EXAMPLE.simpleList);
    const body = dom.window.document.querySelector('body')!;
    mockWindow(dom);

    // act
    load(body);

    // assert
    expect(body.outerHTML).toMatchSnapshot();
  });
});

describe('navigator', () => {
  // RTL: fire tab key and get active element?
  it.todo('it should keyboard tab depth-first');
});

describe('serializer', () => {
  it('removes tabIndexes', () => {
    // arrange
    const dom = new JSDOM(EXAMPLE.simpleList);
    const body = dom.window.document.querySelector('body')!;
    load(body);

    // act
    const result = serialize(body);

    // assert
    expect(result).toMatchSnapshot();
  });
});

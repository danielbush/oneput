/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { load, serialize } from '../lib';
import { fireEvent } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

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
  const jsdomDocument = dom.window.document;
  Object.defineProperty(global, 'window', {
    value: jsdomWindow,
    writable: true,
  });
  Object.defineProperty(global, 'document', {
    value: jsdomDocument,
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
  it.todo('it will focus next element depth-first when I tab');

  it('will highlight sibling events when I tab', async () => {
    // arrange
    const dom = new JSDOM(EXAMPLE.simpleList);
    const body = dom.window.document.querySelector('body')!;
    mockWindow(dom);
    load(body);
    const user = userEvent.setup({ document: dom.window.document });

    // act
    await user.tab();
    await user.tab();

    // assert
    expect(body.outerHTML).toMatchSnapshot();
  });

  it('will highlight sibling events when I click', async () => {
    // arrange
    const dom = new JSDOM(EXAMPLE.simpleList);
    const body = dom.window.document.querySelector('body')!;
    mockWindow(dom);
    load(body);
    const user = userEvent.setup({ document: dom.window.document });

    // act
    await user.click(dom.window.document.querySelector('li')!);

    // assert
    expect(body.outerHTML).toMatchSnapshot();
  });

  describe('sib walking', () => {
    // ie not recursively descending
    it.todo('can walk to next sibling');
    it.todo('can walk to previous sibling');
  });
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

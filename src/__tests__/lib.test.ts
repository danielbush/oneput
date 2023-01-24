/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { load, serialize } from '../lib';
import { fireEvent } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import EXAMPLE from '../__fixtures__';

const REC_DOWN_KEY = 'j';

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
  it('will focus next element depth-first when I tab', async () => {
    // arrange
    const dom = new JSDOM(EXAMPLE.simpleList);
    const body = dom.window.document.querySelector('body')!;
    mockWindow(dom);
    load(body);
    const user = userEvent.setup({ document: dom.window.document });

    // act
    await user.tab();

    // assert
    expect(document.activeElement).toEqual(
      dom.window.document.getElementById('ul'),
    );

    // act
    await user.tab();

    // assert
    expect(document.activeElement).toEqual(
      dom.window.document.getElementById('li1'),
    );

    // act
    await user.tab();

    // assert
    expect(document.activeElement).toEqual(
      dom.window.document.getElementById('li2'),
    );
  });

  it.todo('can tab through custom elements / web components'); // test this with a real example when/if we make one

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

  describe('rec walking', () => {
    it('can walk recursively depth-first', async () => {
      // arrange
      const dom = new JSDOM(EXAMPLE.recList);
      const body = dom.window.document.querySelector('body')!;
      mockWindow(dom);
      load(body);
      const user = userEvent.setup({ document: dom.window.document });

      // act
      await user.click(dom.window.document.getElementById('ul')!);
      await user.keyboard(REC_DOWN_KEY);
      await user.keyboard(REC_DOWN_KEY);

      // assert
      expect(document.activeElement).toEqual(
        dom.window.document.getElementById('ul2'),
      );
    });
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

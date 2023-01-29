/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { load, serialize } from '../lib';
import { fireEvent } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import EXAMPLE from '../__fixtures__';

const REC_DOWN_KEY = 'j';
// const SIB_DOWN_KEY = '{ctrl>}{j}{/ctrl}';
// const SIB_DOWN_KEY = '{ctrl>}j{/ctrl}';
// const SIB_DOWN_KEY = '{ctrl>}{j}{/ctrl}';
const FE_SIB_DOWN_KEY = {
  key: 'j',
  ctrlKey: true,
};

function makeDoc(content: string): string {
  return `<!DOCTYPE html><body>${content}</body>`;
}

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
    it('can walk to next sibling', async () => {
      // arrange
      const recList = makeDoc(
        `<ul id="ul">` +
          `<li id="li1">item 1</li>` +
          `<li id="li2"><ul><li>trap</li></ul></li>` +
          `<li id="li3">item 3</li>` +
          `</ul>`,
      );
      const dom = new JSDOM(recList);
      const user = userEvent.setup({ document: dom.window.document });
      const body = dom.window.document.querySelector('body')!;
      mockWindow(dom);
      load(body);

      // act
      await user.click(dom.window.document.getElementById('li1')!);

      // Almost an hour of my life - wtf? stackoverflow.com/questions/74281534/react-testing-library-user-event-keyboard-not-working
      // await user.keyboard(SIB_DOWN_KEY);
      // await user.keyboard(SIB_DOWN_KEY);
      fireEvent.keyDown(dom.window.document, FE_SIB_DOWN_KEY);
      fireEvent.keyDown(dom.window.document, FE_SIB_DOWN_KEY);

      // assert
      expect(document.activeElement).toEqual(
        dom.window.document.getElementById('li3'),
      );
    });

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

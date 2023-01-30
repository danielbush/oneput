/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { load, serialize } from '../lib';
import { fireEvent } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';

const REC_DOWN_KEY = 'j';
const REC_UP_KEY = 'k';
// const SIB_DOWN_KEY = '{ctrl>}{j}{/ctrl}';
// const SIB_DOWN_KEY = '{ctrl>}j{/ctrl}';
// const SIB_DOWN_KEY = '{ctrl>}{j}{/ctrl}';
const FE_SIB_DOWN_KEY = {
  key: 'j',
  ctrlKey: true,
};
const FE_SIB_UP_KEY = {
  key: 'k',
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
    const dom = new JSDOM(
      makeDoc(
        `<ul id="ul">` +
          `<li id="li1">item 1</li>` +
          `<li id="li2">item 2</li>` +
          `</ul>`,
      ),
    );
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
    const dom = new JSDOM(
      makeDoc(
        `<ul id="ul">` +
          `<li id="li1">item 1</li>` +
          `<li id="li2">item 2</li>` +
          `</ul>`,
      ),
    );
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
    const dom = new JSDOM(
      makeDoc(
        `<ul id="ul">` +
          `<li id="li1">item 1</li>` +
          `<li id="li2">item 2</li>` +
          `</ul>`,
      ),
    );
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
    const dom = new JSDOM(
      makeDoc(
        `<ul id="ul">` +
          `<li id="li1">item 1</li>` +
          `<li id="li2">item 2</li>` +
          `</ul>`,
      ),
    );
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
    it('can walk recursively depth-first to next element', async () => {
      // arrange
      const dom = new JSDOM(
        makeDoc(
          `<ul id="ul">` +
            `<li id="li1">` +
            `<ul id="ul2"><li>item 1.1</li><li>item 1.2</li></ul>` +
            `</li>` +
            `<li id="li2">item 2</li>` +
            `</ul>`,
        ),
      );
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

    it('can walk recursively depth-first to previous element', async () => {
      // arrange
      const dom = new JSDOM(
        makeDoc(
          `<ul id="ul">` +
            `<li id="li1">` +
            `<ul id="ul2"><li id="li2_1">item</li><li id="li2_2">item</li></ul>` +
            `</li>` +
            `<li id="li2">item</li>` +
            `</ul>`,
        ),
      );
      const body = dom.window.document.querySelector('body')!;
      mockWindow(dom);
      load(body);
      const user = userEvent.setup({ document: dom.window.document });
      const ids = [];
      await user.click(dom.window.document.getElementById('li2')!);

      // act
      await user.keyboard(REC_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));
      await user.keyboard(REC_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));
      await user.keyboard(REC_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));

      // assert
      expect(ids).toEqual(['li2_2', 'li2_1', 'ul2']);
    });
  });

  describe('sib walking', () => {
    // ie not recursively descending / ascending
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

    it('can walk to previous sibling', async () => {
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
      await user.click(dom.window.document.getElementById('li3')!);

      // Almost an hour of my life - wtf? stackoverflow.com/questions/74281534/react-testing-library-user-event-keyboard-not-working
      // await user.keyboard(SIB_DOWN_KEY);
      // await user.keyboard(SIB_DOWN_KEY);
      fireEvent.keyDown(dom.window.document, FE_SIB_UP_KEY);
      fireEvent.keyDown(dom.window.document, FE_SIB_UP_KEY);

      // assert
      expect(document.activeElement).toEqual(
        dom.window.document.getElementById('li1'),
      );
    });
  });
});

describe('serializer', () => {
  it('removes tabIndexes', () => {
    // arrange
    const dom = new JSDOM(
      makeDoc(
        `<ul id="ul">` +
          `<li id="li1">item 1</li>` +
          `<li id="li2">item 2</li>` +
          `</ul>`,
      ),
    );
    const body = dom.window.document.querySelector('body')!;
    load(body);

    // act
    const result = serialize(body);

    // assert
    expect(result).toMatchSnapshot();
  });
});

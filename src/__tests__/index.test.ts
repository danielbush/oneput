/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { load, serialize } from '..';
import { fireEvent } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import hotkeys from 'hotkeys-js';

// const REC_DOWN_KEY = 'j';
// const REC_UP_KEY = 'k';
// const SIB_DOWN_KEY = '{ctrl>}{j}{/ctrl}';
// const SIB_DOWN_KEY = '{ctrl>}j{/ctrl}';
// const SIB_DOWN_KEY = '{ctrl>}{j}{/ctrl}';
// const FE_SIB_DOWN_KEY = {
//   key: 'j',
//   ctrlKey: true,
// };
// const FE_SIB_UP_KEY = {
//   key: 'k',
//   ctrlKey: true,
// };
const HK_REC_DOWN_KEY = 'j';
const HK_REC_UP_KEY = 'k';
const HK_SIB_DOWN_KEY = 'ctrl+j';
const HK_SIB_UP_KEY = 'ctrl+k';
const HK_UP_KEY = 'ctrl+cmd+u';

function makeDoc(content: string): string {
  return `<!DOCTYPE html><body id="body">${content}</body>`;
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

const UNLOADS: Array<() => void> = [];

beforeEach(() => {
  let unload;
  while ((unload = UNLOADS.pop())) {
    unload();
  }
});

function loadWithUnload(el: HTMLElement) {
  const unload = load(el);
  UNLOADS.push(unload);
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
    loadWithUnload(body);

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
    const ul = dom.window.document.querySelector('ul')!; // USEREVENT_TAB_BODY
    mockWindow(dom);
    loadWithUnload(ul);
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
    const ul = dom.window.document.querySelector('ul')!; // USEREVENT_TAB_BODY
    mockWindow(dom);
    loadWithUnload(ul);
    const user = userEvent.setup({ document: dom.window.document });

    // act
    await user.tab();
    await user.tab();

    // assert
    expect(ul.outerHTML).toMatchSnapshot();
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
    loadWithUnload(body);
    const user = userEvent.setup({ document: dom.window.document });

    // act
    await user.click(dom.window.document.querySelector('li')!);

    // assert
    expect(body.outerHTML).toMatchSnapshot();
  });

  describe('REC_NEXT / REC_PREV', () => {
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
      loadWithUnload(body);
      const user = userEvent.setup({ document: dom.window.document });
      await user.click(dom.window.document.getElementById('ul')!);

      // act
      // TEST_HOTKEY
      // await userEvent.keyboard(REC_DOWN_KEY);
      // await userEvent.keyboard(REC_DOWN_KEY);
      hotkeys.trigger(HK_REC_DOWN_KEY);
      hotkeys.trigger(HK_REC_DOWN_KEY);

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
      loadWithUnload(body);
      const user = userEvent.setup({ document: dom.window.document });
      const ids = [];
      await user.click(dom.window.document.getElementById('li2')!);

      // act
      hotkeys.trigger(HK_REC_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));
      hotkeys.trigger(HK_REC_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));
      hotkeys.trigger(HK_REC_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));
      hotkeys.trigger(HK_REC_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));
      hotkeys.trigger(HK_REC_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));
      // Overwalk
      hotkeys.trigger(HK_REC_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));

      // assert
      expect(ids).toEqual(['li2_2', 'li2_1', 'ul2', 'li1', 'ul', 'body']);
    });
  });

  describe('SIB_NEXT / SIB_PREV', () => {
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
      loadWithUnload(body);
      const ids = [];
      await user.click(dom.window.document.getElementById('li1')!);

      // act

      // TEST_FIRE
      // await user.keyboard(SIB_DOWN_KEY);
      // await user.keyboard(SIB_DOWN_KEY);
      // TEST_HOTKEY
      // fireEvent.keyDown(dom.window.document, FE_SIB_DOWN_KEY);
      // fireEvent.keyDown(dom.window.document, FE_SIB_DOWN_KEY);
      hotkeys.trigger(HK_SIB_DOWN_KEY);
      ids.push(document.activeElement?.getAttribute('id'));
      hotkeys.trigger(HK_SIB_DOWN_KEY);
      ids.push(document.activeElement?.getAttribute('id'));
      // Overwalk:
      hotkeys.trigger(HK_SIB_DOWN_KEY);
      ids.push(document.activeElement?.getAttribute('id'));

      // assert
      expect(ids).toEqual(['li2', 'li3', 'li3']);
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
      loadWithUnload(body);
      const ids = [];
      await user.click(dom.window.document.getElementById('li3')!);

      // act

      // TEST_FIRE
      // await user.keyboard(SIB_DOWN_KEY);
      // await user.keyboard(SIB_DOWN_KEY);
      // TEST_HOTKEY
      // fireEvent.keyDown(dom.window.document, FE_SIB_UP_KEY);
      // fireEvent.keyDown(dom.window.document, FE_SIB_UP_KEY);
      hotkeys.trigger(HK_SIB_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));
      hotkeys.trigger(HK_SIB_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));
      // Overwalk
      hotkeys.trigger(HK_SIB_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));

      // assert
      expect(document.activeElement).toEqual(
        dom.window.document.getElementById('li1'),
      );
      expect(ids).toEqual(['li2', 'li1', 'li1']);
    });
  });

  describe('UP', () => {
    it('can walk up successive parent elements', async () => {
      // arrange
      const recList = makeDoc(
        `<div id="id1">` +
          `<div id="id2">` +
          `<div id="id3"></div>` +
          `</div>` +
          `</div>`,
      );
      const dom = new JSDOM(recList);
      const user = userEvent.setup({ document: dom.window.document });
      const body = dom.window.document.querySelector('body')!;
      mockWindow(dom);
      loadWithUnload(body);
      const ids = [];
      await user.click(dom.window.document.getElementById('id3')!);

      // act
      hotkeys.trigger(HK_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));
      hotkeys.trigger(HK_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));
      // Overwalk:
      hotkeys.trigger(HK_UP_KEY);
      ids.push(document.activeElement?.getAttribute('id'));

      // assert
      expect(ids).toEqual(['id2', 'id1', 'body']);
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
    mockWindow(dom);
    loadWithUnload(body);

    // act
    const result = serialize(body);

    // assert
    expect(result).toMatchSnapshot();
  });
});

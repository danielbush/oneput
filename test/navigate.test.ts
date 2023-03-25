/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect } from '@jest/globals';
import { JSDOM } from 'jsdom';
import userEvent from '@testing-library/user-event';
import hotkeys from 'hotkeys-js';
import {
  HK_REC_DOWN_KEY,
  HK_REC_UP_KEY,
  HK_SIB_DOWN_KEY,
  HK_SIB_UP_KEY,
  HK_UP_KEY,
  loadWithUnload,
  makeDoc,
  mockWindow,
  unload,
} from './util';

beforeEach(() => {
  unload();
});

describe.skip('navigate', () => {
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

  describe('islands', () => {
    it('should ignore katex islands', async () => {
      // arrange
      const dom = new JSDOM(
        makeDoc(
          `<div id="div1">` +
            `<div class="katex"><div>should not go here</div></div>` +
            `<div id="div2">div 2</div>` +
            `</div>`,
        ),
      );
      const body = dom.window.document.querySelector('body')!;
      mockWindow(dom);
      loadWithUnload(body);
      const user = userEvent.setup({ document: dom.window.document });
      await user.click(dom.window.document.getElementById('div1')!);

      // act
      hotkeys.trigger(HK_REC_DOWN_KEY);
      console.log(dom.window.document.activeElement?.outerHTML);
      hotkeys.trigger(HK_REC_DOWN_KEY);
      console.log(dom.window.document.activeElement?.outerHTML);

      // assert
      expect(document.activeElement).toEqual(
        dom.window.document.getElementById('div2'),
      );
    });
  });
});

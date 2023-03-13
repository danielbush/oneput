/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { serialize } from '../src/lib/load';
import { loadWithUnload, makeDoc, mockWindow, unload } from './util';

beforeEach(() => {
  unload();
});

describe.skip('serializer', () => {
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
    const result = serialize(new Set(), body);

    // assert
    expect(result).toMatchSnapshot();
  });
});

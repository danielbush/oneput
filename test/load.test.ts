/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { loadWithUnload, makeDoc, mockWindow, unload } from './util';

beforeEach(() => {
  unload();
});

describe.skip('loader', () => {
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

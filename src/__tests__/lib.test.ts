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

describe('loading', () => {
  it('can load the document', () => {
    // arrange
    const dom = new JSDOM(EXAMPLE.simpleList);
    const body = dom.window.document.querySelector('body')!;

    // act
    load(body);
  });
});

describe('navigator', () => {
  // RTL: fire tab key and get active element?
  it.todo('it should keyboard tab depth-first');
});

describe('serializing', () => {
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

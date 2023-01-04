import { describe, expect, test } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { load } from '../index';

describe('loading', () => {
  it('can load the document', () => {
    // Arrange
    const dom = new JSDOM(
      `<!DOCTYPE html><body><ul><li>item 1</li><li>item 2</li></ul></body>`,
    );
    const [body] = dom.window.document.getElementsByTagName('body');
    load(body);
  });
});

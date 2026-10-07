import { describe, expect, test } from 'vitest';
import { identifyChildren } from '../../../../test/util';
import { createElement } from '../create';

describe('createElement', () => {
  test('builds exactly the requested element', () => {
    // act
    const el = createElement({ tagName: 'ul' });

    // assert
    expect(identifyChildren(el)).toEqual([]);
  });

  test('builds nested specs', () => {
    // act
    const el = createElement({
      tagName: 'ul',
      children: [{ tagName: 'li', children: [{ tagName: 'p' }] }]
    });

    // assert
    expect(identifyChildren(el)).toEqual(['[element:li]']);
    expect(identifyChildren(el.firstElementChild)).toEqual(['[element:p]']);
    expect(identifyChildren(el.querySelector('p'))).toEqual(['[anchor]']);
  });

  test('anchorable leaf gets an anchor', () => {
    // act
    const el = createElement({ tagName: 'p' });

    // assert
    expect(identifyChildren(el)).toEqual(['[anchor]']);
  });
});

import { describe, expect, test } from 'vitest';
import { byId, div, identifyChildren, makeRoot, p } from '../../../../test/util';
import { createElement, getInitialFocusTarget } from '../create';

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

describe('getInitialFocusTarget', () => {
  test('ul resolves to its li', () => {
    // arrange
    const el = createElement({ tagName: 'ul', children: [{ tagName: 'li' }] });

    // act
    const target = getInitialFocusTarget(el);

    // assert
    expect(target.tagName).toBe('LI');
  });

  test('anchorable element resolves to itself', () => {
    // arrange
    const el = createElement({ tagName: 'p' });

    // act
    const target = getInitialFocusTarget(el);

    // assert
    expect(target).toBe(el);
  });

  test('non-anchorable element with no anchorable descendant falls back to itself', () => {
    // arrange
    const el = createElement({ tagName: 'div' });

    // act
    const target = getInitialFocusTarget(el);

    // assert
    expect(target).toBe(el);
  });

  test('ul with paragraph resolves to the paragraph', () => {
    // arrange
    const el = createElement({
      tagName: 'ul',
      children: [{ tagName: 'li', children: [{ tagName: 'p' }] }]
    });

    // act
    const target = getInitialFocusTarget(el);

    // assert
    expect(target.tagName).toBe('P');
  });

  test('table resolves to its first cell', () => {
    // arrange
    const el = createElement({
      tagName: 'table',
      children: [
        {
          tagName: 'tbody',
          children: [{ tagName: 'tr', children: [{ tagName: 'td' }] }]
        }
      ]
    });

    // act
    const target = getInitialFocusTarget(el);

    // assert
    expect(target.tagName).toBe('TD');
  });

  test('finds re-opened focus-on leaf inside a focus-off ancestor', () => {
    // arrange — focus-off container, transparent wrappers, nested focus-on leaf
    const doc = makeRoot(
      div(
        { id: 'outer' },
        div(
          { id: 'off', 'data-jsed-focus': 'off' },
          div(div(p({ id: 'leaf', 'data-jsed-focus': 'on' }, 'editable')))
        )
      )
    );

    // act
    const fromOff = getInitialFocusTarget(byId(doc, 'off'));
    const fromOuter = getInitialFocusTarget(byId(doc, 'outer'));

    // assert
    expect(fromOff).toBe(byId(doc, 'leaf'));
    expect(fromOuter).toBe(byId(doc, 'leaf'));
  });

  test('focus-off ancestor with no re-opened leaf is not chosen as the target', () => {
    // arrange
    const doc = makeRoot(
      div({ id: 'outer' }, div({ id: 'off', 'data-jsed-focus': 'off' }, div(p('plain'))))
    );

    // act
    const fromOff = getInitialFocusTarget(byId(doc, 'off'));
    const fromOuter = getInitialFocusTarget(byId(doc, 'outer'));

    // assert — no FOCUSABLE leaf under off; fall back to the element passed in
    expect(fromOff).toBe(byId(doc, 'off'));
    expect(fromOuter).toBe(byId(doc, 'outer'));
  });
});

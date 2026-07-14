import { describe, expect, test } from 'vitest';
import { JSED_SELECTION_CLASS } from '../../core/taxonomy.js';
import {
  em,
  identifyChildren,
  inlineStyleHack,
  makeRawRoot,
  p,
  s,
  sel,
  t
} from '../../../test/util.js';
import {
  convertWrapper,
  deleteSelection,
  redoConvertWrapper,
  removeSelectionWrappers,
  undoConvertWrapper
} from '../selection.js';

function getWrapper(root: HTMLElement): HTMLElement {
  return root.querySelector(`.${JSED_SELECTION_CLASS}`) as HTMLElement;
}

describe('removeWrapper', () => {
  test('partially encloses an element content', () => {
    // arrange
    const root = makeRawRoot(
      p(
        em(
          inlineStyleHack,
          sel(t('a'), s()), //
          t('b')
        )
      )
    );
    const wrapper = getWrapper(root);

    // act
    const result = deleteSelection(wrapper, root);

    // assert
    expect(result.removedTokens).toHaveLength(1);
    expect(result.deleteHighestEmpty).toBe(false);
    expect(identifyChildren(root.querySelector('em'))).toEqual([
      'd("a")', //
      '[deleted-space]',
      'b'
    ]);
  });

  test('fully encloses an element content', () => {
    // arrange
    const root = makeRawRoot(
      p(
        em(
          inlineStyleHack,
          sel(t('a'), s(), t('b')) //
        )
      )
    );
    const wrapper = getWrapper(root);
    const p1 = root.querySelector('p')!;

    // act
    const result = deleteSelection(wrapper, p1);

    // assert
    expect(result.removedTokens).toHaveLength(2);
    // expect(result.deleteHighest).toEqual({});
    expect(root.querySelector('em')).toBeNull();
    expect(identifyChildren(root.querySelector('p'))).toEqual([
      '[deleted-element]', //
      '[anchor]'
    ]);
  });
});

describe('removeSelectionWrappers', () => {
  test('unwraps the selection span and keeps its content in place', () => {
    // arrange
    const root = makeRawRoot(
      p(
        t('before'),
        s(),
        sel(t('selected')), //
        s(),
        t('after')
      )
    );

    // act
    removeSelectionWrappers(root);

    // assert
    expect(root.querySelector(`.${JSED_SELECTION_CLASS}`)).toBeNull();
    expect(root.querySelector('p')?.textContent).toBe('before selected after');
  });
});

describe('convertWrapper', () => {
  test('multiple children', () => {
    // arrange
    const root = makeRawRoot(
      p(
        t('before'), //
        s(),
        sel(t('x'), s(), t('y')),
        s(),
        t('after')
      )
    );
    const parent = root.querySelector('p')!;
    const wrapper = getWrapper(root);

    // act
    const op = convertWrapper(wrapper, 'em')!;

    // assert
    expect(op).toMatchObject({ action: 'convert-wrapper', tagName: 'em' });
    expect(root.querySelector(`.${JSED_SELECTION_CLASS}`)).toBeNull();
    expect(identifyChildren(parent)).toEqual([
      'before',
      '[nodeType=3:" "]',
      '[element:em]',
      '[nodeType=3:" "]',
      'after'
    ]);
    expect(identifyChildren(op.container)).toEqual(['x', '[nodeType=3:" "]', 'y']);
  });

  test('single child', () => {
    // arrange
    const root = makeRawRoot(
      p(
        t('before'), //
        s(),
        sel(t('x'))
      )
    );
    const parent = root.querySelector('p')!;
    const wrapper = getWrapper(root);

    // act
    const op = convertWrapper(wrapper, 'strong')!;

    // assert
    expect(identifyChildren(parent)).toEqual([
      'before', //
      '[nodeType=3:" "]',
      '[element:strong]'
    ]);
    expect(identifyChildren(op.container)).toEqual(['x']);
  });

  test('undo - multiple children', () => {
    // arrange
    const root = makeRawRoot(
      p(
        t('before'), //
        s(),
        sel(t('x'), s(), t('y')),
        s(),
        t('after')
      )
    );
    const parent = root.querySelector('p')!;
    const op = convertWrapper(getWrapper(root), 'em')!;

    // act
    undoConvertWrapper(op);

    // assert
    expect(root.querySelector('em')).toBeNull();
    expect(root.querySelector(`.${JSED_SELECTION_CLASS}`)).toBeNull();
    expect(identifyChildren(parent)).toEqual([
      'before',
      '[nodeType=3:" "]',
      '[deleted-element]', // marker holding the container's slot
      'x',
      '[nodeType=3:" "]',
      'y',
      '[nodeType=3:" "]',
      'after'
    ]);
  });

  test('redo - multiple children', () => {
    // arrange
    const root = makeRawRoot(
      p(
        t('before'), //
        s(),
        sel(t('x'), s(), t('y')),
        s(),
        t('after')
      )
    );
    const parent = root.querySelector('p')!;
    const op = convertWrapper(getWrapper(root), 'em')!;
    undoConvertWrapper(op);

    // act
    redoConvertWrapper(op);

    // assert
    expect(identifyChildren(parent)).toEqual([
      'before',
      '[nodeType=3:" "]',
      '[element:em]',
      '[nodeType=3:" "]',
      'after'
    ]);
    expect(identifyChildren(op.container)).toEqual(['x', '[nodeType=3:" "]', 'y']);
  });

  test('undo / redo / undo round trip', () => {
    // arrange
    const root = makeRawRoot(
      p(
        t('before'), //
        s(),
        sel(t('x'), s(), t('y'))
      )
    );
    const parent = root.querySelector('p')!;
    const op = convertWrapper(getWrapper(root), 'em')!;
    const converted = identifyChildren(parent);

    // act
    undoConvertWrapper(op);
    redoConvertWrapper(op);

    // assert
    expect(identifyChildren(parent)).toEqual(converted);

    // act
    undoConvertWrapper(op);

    // assert
    expect(identifyChildren(parent)).toEqual([
      'before',
      '[nodeType=3:" "]',
      '[deleted-element]', // marker holding the container's slot
      'x',
      '[nodeType=3:" "]',
      'y'
    ]);
  });

  test('empty WRAPPER', () => {
    // arrange
    const root = makeRawRoot(
      p(
        t('before'), //
        s(),
        sel()
      )
    );
    const parent = root.querySelector('p')!;
    const op = convertWrapper(getWrapper(root), 'em')!;
    undoConvertWrapper(op);

    // act
    redoConvertWrapper(op);

    // assert
    expect(identifyChildren(parent)).toEqual([
      'before', //
      '[nodeType=3:" "]',
      '[element:em]'
    ]);
  });
});

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
import { removeSelectionWrappers, removeWrapper } from '../selection.js';

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
    const result = removeWrapper(wrapper, root);

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
    const result = removeWrapper(wrapper, p1);

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

import { describe, it, expect } from 'vitest';
import { byId, makeRoot, p } from '../../test/util';
import { tokenize } from './token';

describe('tokenize', () => {
  it('should token a node with text', () => {
    // arrange
    const cx = makeRoot(p({ id: 'p1' }, 'Here is a sentence'));
    const p1 = cx.document.getElementById('p1') as HTMLElement;

    // act
    tokenize(p1);

    // assert
    expect(byId(cx, 'p1')).toMatchSnapshot();
  });
});

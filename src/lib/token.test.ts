import { describe, it, expect } from 'vitest';
import { byId, makeRoot, p } from '../../test/util';
import { tokenize } from './token';

describe('tokenize', () => {
  it('should token a node with text', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'Here is a sentence'));
    const p1 = doc.document.getElementById('p1') as HTMLElement;

    // act
    tokenize(p1);

    // assert
    expect(byId(doc, 'p1')).toMatchSnapshot();
  });
});

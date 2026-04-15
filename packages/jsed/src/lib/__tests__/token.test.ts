import { describe, expect, it } from 'vitest';
import { createToken, createAnchor, replaceText } from '../token.js';
import { isAnchor } from '../taxonomy.js';

describe('replaceText', () => {
  it('rewrites an existing TOKEN text node', () => {
    // arrange
    const token = createToken('foo');

    // act
    replaceText(token, 'bar');

    // assert
    expect(token.textContent).toBe('bar');
    expect(token.childNodes).toHaveLength(1);
    expect(token.firstChild?.nodeType).toBe(Node.TEXT_NODE);
  });

  it('converts an empty ANCHOR into a TOKEN with a text node', () => {
    // arrange
    const anchor = createAnchor();
    expect(anchor.childNodes).toHaveLength(0);

    // act
    replaceText(anchor, 'bar');

    // assert
    expect(isAnchor(anchor)).toBe(false);
    expect(anchor.textContent).toBe('bar');
    expect(anchor.childNodes).toHaveLength(1);
    expect(anchor.firstChild?.nodeType).toBe(Node.TEXT_NODE);
  });
});

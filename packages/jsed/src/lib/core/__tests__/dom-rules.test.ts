import { describe, expect, test } from 'vitest';
import { getRequiredChildTag } from '../dom-rules';

describe('getRequiredChildTag', () => {
  test('ul -> li', () => {
    expect(getRequiredChildTag('ul')).toBe('li');
  });

  test('ol -> li', () => {
    expect(getRequiredChildTag('OL')).toBe('li');
  });

  test('p -> null', () => {
    expect(getRequiredChildTag('p')).toBeNull();
  });
});

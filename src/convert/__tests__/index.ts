import { describe, expect, test } from '@jest/globals';
import { convert } from '../index';

/**
 * Convenience function for tests to construct multiline html.
 *
 * @param strs Lines of html
 * @returns
 */
const j = (...strs: string[]): string => {
  return strs.join('\n');
};

describe('convert', () => {
  describe('converting normal markdown', () => {
    test('title', () => {
      const md = convert('# test');
      expect(md).toEqual(j('<h1 id="test">test</h1>', ''));
    });

    test('title outline', () => {
      const md = convert('# level 1\n\nword\n\n## level 2');
      expect(md).toEqual(
        j(
          '<h1 id="level-1">level 1</h1>',
          '<p>word</p>',
          '<h2 id="level-2">level 2</h2>',
          '',
        ),
      );
    });
  });
});

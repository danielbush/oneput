import { describe, expect, test } from '@jest/globals';
import { convert } from '../src/convert';

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
  test('title', () => {
    const md = convert('# test');
    expect(md).toMatchSnapshot();
  });

  test('title outline', () => {
    const md = convert('# level 1\n\nword\n\n## level 2');
    expect(md).toEqual(
      j('<h1>level 1</h1>', '<p>word</p>', '<h2>level 2</h2>', ''),
    );
  });

  it('should handle katex', () => {
    const md = convert(
      '# level 1\n\nword $X \\beta = y + \\epsilon$\n\n## level 2',
    );

    expect(md).toMatchSnapshot();
  });
});

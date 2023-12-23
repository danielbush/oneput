import { describe, it, expect } from 'vitest'
import { convert } from './convert';

describe('convert', () => {
  it('should convert a title', () => {
    // act
    const md = convert('# test');

    // assert
    expect(md).toMatchSnapshot();
  });

  it('should convert a title outline', () => {
    // act
    const md = convert('# level 1\n\nword\n\n## level 2');

    // assert
    expect(md).toMatchSnapshot();
  });

  it('should handle katex', () => {
    // act
    const md = convert(
      '# level 1\n\nword $X \\beta = y + \\epsilon$\n\n## level 2',
    );

    // assert
    expect(md).toMatchSnapshot();
  });
});

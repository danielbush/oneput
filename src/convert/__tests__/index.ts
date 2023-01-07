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
  test('title', () => {
    const md = convert('# test');
    expect(md).toEqual(j('<h1>test</h1>', ''));
  });

  test('title outline', () => {
    const md = convert('# level 1\n\nword\n\n## level 2');
    expect(md).toEqual(
      j('<h1>level 1</h1>', '<p>word</p>', '<h2>level 2</h2>', ''),
    );
  });

  it('should handle katex', () => {
    const katex = `<span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><mi>X</mi><mi>β</mi><mo>=</mo><mi>y</mi><mo>+</mo><mi>ϵ</mi></mrow><annotation encoding="application/x-tex">X \\beta = y + \\epsilon</annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:0.8888799999999999em;vertical-align:-0.19444em;"></span><span class="mord mathnormal" style="margin-right:0.07847em;">X</span><span class="mord mathnormal" style="margin-right:0.05278em;">β</span><span class="mspace" style="margin-right:0.2777777777777778em;"></span><span class="mrel">=</span><span class="mspace" style="margin-right:0.2777777777777778em;"></span></span><span class="base"><span class="strut" style="height:0.7777700000000001em;vertical-align:-0.19444em;"></span><span class="mord mathnormal" style="margin-right:0.03588em;">y</span><span class="mspace" style="margin-right:0.2222222222222222em;"></span><span class="mbin">+</span><span class="mspace" style="margin-right:0.2222222222222222em;"></span></span><span class="base"><span class="strut" style="height:0.43056em;vertical-align:0em;"></span><span class="mord mathnormal">ϵ</span></span></span></span>`;

    const md = convert(
      '# level 1\n\nword $X \\beta = y + \\epsilon$\n\n## level 2',
    );

    expect(md).toEqual(
      j('<h1>level 1</h1>', `<p>word ${katex}</p>`, '<h2>level 2</h2>', ''),
    );
  });
});

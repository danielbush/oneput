// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import katex from 'katex';
import { restrictKatexOutput } from './outputPolicy.js';

describe('formula output policy', () => {
  test.each([
    ['MathML fractions and scripts', String.raw`\frac{x^2}{y}+\sum_{i=0}^n i`, 'math mfrac'],
    ['SVG roots', String.raw`\sqrt{x}`, 'svg path'],
    [
      'SVG arrows and braces',
      String.raw`\overrightarrow{ABC}+\underbrace{x+y}_{z}+\overbrace{a+b}`,
      'svg path'
    ],
    ['MathML tables', String.raw`\left(\begin{matrix}a&b\\c&d\end{matrix}\right)`, 'math mtable'],
    [
      'layout and color',
      String.raw`\color{red}\rule{1em}{0.2em}+\pmb{x}+\textcolor{blue}{y}`,
      '[style]'
    ]
  ])('preserves %s', (_name, source, selector) => {
    // arrange
    const fragment = document.createElement('template');
    fragment.innerHTML = katex.renderToString(source, {
      trust: false,
      strict: 'error',
      maxExpand: 1000,
      maxSize: 20
    });
    const original = fragment.content.cloneNode(true);

    // act
    restrictKatexOutput(fragment.content);

    // assert
    expect(fragment.content.isEqualNode(original)).toBe(true);
    expect(fragment.content.querySelector(selector)).not.toBeNull();
  });

  test.each([
    ['active HTML', '<script>void 0</script>'],
    ['resource', '<img src="https://example.com/image">'],
    ['event attribute', '<span onclick="void 0">x</span>'],
    ['unknown attribute', '<span data-extra="x">x</span>'],
    ['MathML URL', '<math><mi href="https://example.com">x</mi></math>'],
    ['MathML unknown attribute', '<math><mi constructor="x">x</mi></math>'],
    ['MathML event', '<math><mi onclick="void 0">x</mi></math>'],
    [
      'MathML integration point',
      '<math><annotation-xml encoding="text/html"><span>x</span></annotation-xml></math>'
    ],
    ['SVG link', '<svg><a href="https://example.com"><path d="M0 0"/></a></svg>'],
    ['SVG foreignObject', '<svg><foreignObject><span>x</span></foreignObject></svg>'],
    ['SVG animation', '<svg><animate attributeName="href"/></svg>'],
    ['SVG paint URL', '<svg><path d="M0 0" fill="url(https://example.com)"/></svg>'],
    ['SVG event', '<svg onload="void 0"><path d="M0 0"/></svg>'],
    ['CSS resource', '<span style="background-image:url(https://example.com)">x</span>'],
    ['CSS custom property', '<span style="--formula:url(https://example.com)">x</span>'],
    ['CSS fixed position', '<span style="position:fixed">x</span>'],
    ['CSS function', '<span style="width:var(--width)">x</span>'],
    ['CSS escape', '<span style="c\\6flor:red">x</span>'],
    ['comment', '<!-- unexpected -->'],
    ['depth limit', '<span>'.repeat(66) + 'x' + '</span>'.repeat(66)],
    ['node limit', '<span>x</span>'.repeat(5001)]
  ])('refuses %s', (_name, html) => {
    // arrange
    const fragment = document.createElement('template');
    fragment.innerHTML = html;

    // act
    restrictKatexOutput(fragment.content);

    // assert
    expect(fragment.content.textContent).toBe('Content unavailable');
    expect(fragment.content.children).toHaveLength(0);
  });
});

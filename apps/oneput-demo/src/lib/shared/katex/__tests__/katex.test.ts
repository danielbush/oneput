// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { DemoDocument, paintPreview, renderFormula } from '../katex.js';

/** Compile `source` and expect checked output. */
function html(source: string, displayMode = false, doc = DemoDocument.createNull()) {
  const result = renderFormula(source, displayMode, doc);
  if (!('html' in result)) throw new Error(`Expected html, got ${JSON.stringify(result)}`);
  return result.html;
}

describe('renderFormula', () => {
  test('empty', () => {
    // arrange
    const doc = DemoDocument.createNull();

    // act
    const result = renderFormula('  ', false, doc);

    // assert
    expect(result).toEqual({ empty: true });
  });

  test('valid', () => {
    // arrange
    const node = document.createElement('div');

    // act
    paintPreview(node, html('x^2'));

    // assert
    expect(node.querySelector('.katex')).not.toBeNull();
    expect(node.querySelector('annotation')?.textContent).toBe('x^2');
  });

  test('sanitiser refusal', () => {
    // arrange
    const doc = DemoDocument.createNull(undefined, {
      sanitiseErrors: [new Error('HTML sanitization is unavailable.')]
    });

    // act
    const result = renderFormula('x^2', false, doc);

    // assert
    expect(result).toEqual({ error: 'HTML sanitization is unavailable.' });
  });

  test.each([
    String.raw`\href{javascript:alert(1)}{x}`,
    String.raw`\htmlStyle{background:url(https://example.com)}{x}`,
    String.raw`\includegraphics{https://example.com/pixel}`
  ])('trust stays off: %s', (source) => {
    // arrange
    const root = document.createElement('div');
    const doc = DemoDocument.createNull(root);
    const result = renderFormula(source, false, doc);

    // act
    if ('html' in result) doc.append(result.html, false);

    // assert
    expect(root.querySelector('a, img, script, [onerror], [onload]')).toBeNull();
    expect(root.querySelector('[style*="url("]')).toBeNull();
  });

  test.each([String.raw`\def\a{\a}\a`, 'x'.repeat(4097), 'x+'.repeat(1000)])(
    'refuses unsafe or large input: %s',
    (source) => {
      // arrange
      const doc = DemoDocument.createNull();

      // act
      const result = renderFormula(source, false, doc);

      // assert
      expect(result).toHaveProperty('error');
    }
  );
});

describe('DemoDocument.append', () => {
  test('inline keeps old nodes', () => {
    // arrange
    const root = document.createElement('div');
    const existing = document.createElement('button');
    root.append(existing);
    const doc = DemoDocument.createNull(root);

    // act
    doc.append(html('x^2', false, doc), false);

    // assert
    expect(root.firstChild).toBe(existing);
    expect(root.querySelector('p .katex')).not.toBeNull();
    expect(root.querySelector('math')).not.toBeNull();
  });

  test('display', () => {
    // arrange
    const root = document.createElement('div');
    const doc = DemoDocument.createNull(root);

    // act
    doc.append(html('x', true, doc), true);

    // assert
    expect(root.querySelector('.katex-display')).not.toBeNull();
    expect(root.querySelector('p')).toBeNull();
  });
});

describe('paintPreview', () => {
  test('none', () => {
    // arrange
    const node = document.createElement('div');
    paintPreview(node, html('x'));

    // act
    paintPreview(node, null);

    // assert
    expect(node.textContent).toBe('(preview)');
    expect(node.querySelector('.katex')).toBeNull();
  });
});

// @vitest-environment happy-dom
import { describe, expect, test } from 'vitest';
import { notifier } from '@oneput/oneput';
import { DemoDocument, KatexFormula, KatexPreview } from './KatexDemo.js';

describe('KaTeX content boundary', () => {
  test('append preserves old nodes', () => {
    // arrange
    const root = document.createElement('div');
    const existing = document.createElement('button');
    root.append(existing);
    const formula = new KatexFormula(DemoDocument.createNull(root));
    formula.setSource('x^2');

    // act
    const inserted = formula.insert();

    // assert
    expect(inserted).toBe(true);
    expect(root.firstChild).toBe(existing);
    expect(root.querySelector('p .katex')).not.toBeNull();
    expect(root.querySelector('math')).not.toBeNull();
  });

  test('display output', () => {
    // arrange
    const root = document.createElement('div');
    const formula = new KatexFormula(DemoDocument.createNull(root), true);
    formula.setSource('x');

    // act
    formula.insert();

    // assert
    expect(root.querySelector('.katex-display')).not.toBeNull();
    expect(root.querySelector('p')).toBeNull();
  });

  test('preview follows source and clears', () => {
    // arrange
    const root = document.createElement('div');
    const formula = new KatexFormula(DemoDocument.createNull());
    const stop = KatexPreview.onMount(formula)(root, { pull: notifier() });

    // act
    formula.setSource('x^2');

    // assert
    expect(root.querySelector('.katex')).not.toBeNull();
    expect(root.textContent).toContain('x');

    // act
    formula.setSource('');

    // assert
    expect(root.textContent).toBe('(preview)');
    expect(root.querySelector('.katex')).toBeNull();
    stop();
  });

  test.each([
    String.raw`\href{javascript:alert(1)}{x}`,
    String.raw`\htmlStyle{background:url(https://example.com)}{x}`,
    String.raw`\includegraphics{https://example.com/pixel}`
  ])('trust stays off: %s', (source) => {
    // arrange
    const root = document.createElement('div');
    const formula = new KatexFormula(DemoDocument.createNull(root));
    formula.setSource(source);

    // act
    formula.insert();

    // assert
    expect(root.querySelector('a, img, script, [onerror], [onload]')).toBeNull();
    expect(root.querySelector('[style*="url("]')).toBeNull();
  });

  test.each([String.raw`\def\a{\a}\a`, 'x'.repeat(4097), 'x+'.repeat(1000)])(
    'refuses unsafe or large input: %s',
    (source) => {
      // arrange
      const root = document.createElement('div');
      const formula = new KatexFormula(DemoDocument.createNull(root));
      formula.setSource(source);

      // act
      const inserted = formula.insert();

      // assert
      expect(inserted).toBe(false);
      expect(formula.current.error).toBeDefined();
      expect(root.childNodes).toHaveLength(0);
    }
  );
});

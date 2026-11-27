// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { notifier } from '@oneput/oneput';
import { DemoDocument } from '../shared/katex/katex.js';
import { KatexFormula, KatexPreview } from './KatexDemo.js';

describe('KatexFormula', () => {
  test('insert appends and starts a new formula', () => {
    // arrange
    const root = document.createElement('div');
    const formula = new KatexFormula(DemoDocument.createNull(root), true);
    formula.setSource('x');

    // act
    const inserted = formula.insert();

    // assert
    expect(inserted).toBe(true);
    expect(root.querySelector('.katex-display')).not.toBeNull();
    expect(formula.current).toMatchObject({ source: '', preview: null, canInsert: false });
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

  test('preview recovers after sanitiser refusal', () => {
    // arrange
    const root = document.createElement('div');
    const doc = DemoDocument.createNull(document.createElement('div'), {
      sanitiseErrors: [new Error('HTML sanitization is unavailable.'), null]
    });
    const formula = new KatexFormula(doc);
    const stop = KatexPreview.onMount(formula)(root, { pull: notifier() });

    // act
    formula.setSource('x^2');

    // assert
    expect(formula.current.error).toBe('HTML sanitization is unavailable.');
    expect(formula.current.canInsert).toBe(false);
    expect(root.textContent).toBe('(preview)');

    // act
    formula.setSource('y^2');

    // assert
    expect(formula.current.error).toBeUndefined();
    expect(formula.current.canInsert).toBe(true);
    expect(root.querySelector('.katex')).not.toBeNull();
    expect(root.querySelector('annotation')?.textContent).toBe('y^2');
    stop();
  });

  test('invalid source does not insert', () => {
    // arrange
    const root = document.createElement('div');
    const formula = new KatexFormula(DemoDocument.createNull(root));
    formula.setSource('x^');

    // act
    const inserted = formula.insert();

    // assert
    expect(inserted).toBe(false);
    expect(formula.current.error).toBeDefined();
    expect(root.childNodes).toHaveLength(0);
  });
});

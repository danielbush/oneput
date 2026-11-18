import { describe, expect, test } from 'vitest';
import { convert, convertMd } from '../convert.js';

describe('markdown conversion', () => {
  test('raw HTML stays text', () => {
    // arrange
    const source = '<img src=x onerror=bad()>';
    const root = document.createElement('div');

    // act
    root.innerHTML = convertMd(source);

    // assert
    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toContain(source);
  });

  test('template metadata stays in its own context', () => {
    // arrange
    const title = '</title><script>bad()</script>';
    const description = '\"><img src=x onerror=bad()>';

    const template = document.createElement('template');

    // act
    template.innerHTML = convert('body', title, description);
    const doc = template.content;

    // assert
    expect(doc.querySelector('title')?.textContent).toBe(title);
    const meta = doc.querySelector('meta[name="Description"]');
    expect(meta?.getAttribute('content')).toContain('img src=x onerror=bad()');
    expect(meta?.getAttributeNames()).toEqual(['name', 'content']);
    expect(doc.querySelector('img')).toBeNull();
    expect(doc.querySelectorAll('script')).toHaveLength(1);
    expect(doc.querySelector('script')?.getAttribute('src')).toBe('/src/index.tsx');
    expect(doc.textContent).toContain('body');
  });
});

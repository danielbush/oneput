import { describe, expect, test } from 'vitest';
import { checkElement, checkedAttachments, DomWriteWarnings } from './domSafety.js';

describe('UI write policy', () => {
  test.each([
    'textarea',
    'title',
    'xmp',
    'plaintext',
    'noscript',
    'script',
    'iframe',
    'object',
    'embed',
    'form',
    'base',
    'meta',
    'link',
    'style',
    'svg',
    'math',
    'foreignObject',
    'x-widget'
  ])('forbidden tag: %s', (tag) => {
    // arrange
    const params = { tag };

    // act
    const result = checkElement(params);

    // assert
    expect(result.tag).toBe('div');
    expect(result.refused).toEqual([`tag:${tag.toLowerCase()}`]);
  });

  test.each([
    'onclick',
    'OnError',
    'onload',
    'srcdoc',
    'srcset',
    'action',
    'formaction',
    'ping',
    'xlink:href',
    'style',
    'class',
    'id',
    'is',
    'unknown'
  ])('forbidden attribute: %s', (name) => {
    // arrange
    const params = { tag: 'a', attr: { [name]: 'bad' } };

    // act
    const result = checkElement(params);

    // assert
    expect(result.attr).toEqual({});
    expect(result.refused).toEqual([`attribute:${name}`]);
  });

  for (const [tag, attribute] of [
    ['a', 'href'],
    ['img', 'src']
  ]) {
    test.each([
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'java\tscript:alert(1)',
      'data:text/html,bad',
      'data:image/png;base64,AAAA',
      'vbscript:msgbox(1)',
      'file:///tmp/a',
      'blob:https://example.com/a',
      '\\evil.com/a'
    ])(`${tag} forbidden URL: %s`, (url) => {
      // arrange
      const params = { tag, attr: { [attribute]: url } };

      // act
      const result = checkElement(params);

      // assert
      expect(result.attr).toEqual({});
      expect(result.refused).toEqual([`attribute:${attribute}`]);
    });
  }

  test.each([
    ['cssText', 'color:red'],
    ['backgroundImage', 'url(https://example.com/a)'],
    ['color', 'expression(alert(1))'],
    ['color', 'red;display:none'],
    ['color', 'u\\72l(x)'],
    ['width', 'var(--untrusted)'],
    ['width', 'attr(data-size)'],
    ['width', 'calc(1px + 1px)'],
    ['position', 'fixed'],
    ['position', 'sticky'],
    ['zIndex', '9999'],
    ['opacity', '-1'],
    ['--resource', 'url(x)']
  ])('forbidden style: %s=%s', (name, value) => {
    // arrange
    const params = { style: { [name]: value } };

    // act
    const result = checkElement(params);

    // assert
    expect(result.style).toBe('');
    expect(result.refused).toEqual([`style:${name}`]);
  });

  test('element-specific URLs and safe style', () => {
    // arrange
    const params = {
      tag: 'button',
      attr: { href: 'https://example.com', src: '/a' },
      style: { color: '#777', flex: '0 0 100%' }
    };

    // act
    const result = checkElement(params);

    // assert
    expect(result.attr).toEqual({});
    expect(result.style).toBe('color:#777;flex:0 0 100%');
  });

  test('normalised link and new-window protection', () => {
    // arrange
    const params = {
      tag: 'A',
      attr: { href: ' https://example.com/a ', target: '_blank', rel: 'opener' }
    };

    // act
    const result = checkElement(params);

    // assert
    expect(result.tag).toBe('a');
    expect(result.attr).toEqual({
      href: 'https://example.com/a',
      target: '_blank',
      rel: 'noopener noreferrer'
    });
  });

  test('attachments cannot carry string attributes', () => {
    // arrange
    const attachments = { onclick: 'bad', srcdoc: 'bad' };

    // act
    const result = checkedAttachments(attachments);

    // assert
    expect(Object.keys(result)).toEqual([]);
  });

  test.each([true, false])('warning output in development=%s', (development) => {
    // arrange
    const warnings = DomWriteWarnings.createNull(development);
    const output = warnings.trackWarnings();

    // act
    const result = checkElement({ tag: 'script', attr: { onclick: 'bad' } });
    warnings.report(result.refused);

    // assert
    expect(result.tag).toBe('div');
    expect(result.attr).toEqual({});
    expect(output.data).toEqual(
      development ? ['Oneput refused tag:script', 'Oneput refused attribute:onclick'] : []
    );
  });
});

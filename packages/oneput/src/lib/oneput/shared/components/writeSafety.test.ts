// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { writable } from 'svelte/store';
import Harness from './WriteSafety.test.svelte';
import { describe, expect, test } from 'vitest';
import { sanitiseHtml, type SafeHtml } from '@oneput/safe-html';
import { fchild, hflex } from '../../lib/builder.js';
import type { FChildParams, FlexParams } from '../../types.js';
import Flex from './Flex.svelte';

const hostileAttributes = {
  onclick: 'alert(1)',
  href: 'javascript:alert(1)',
  srcdoc: '<script>bad</script>',
  style: 'background:url(https://example.com)',
  id: 'overridden',
  class: 'overridden'
};

describe('checked DOM writes', () => {
  test('FChild: mount, update, removal', () => {
    // arrange
    const target = document.createElement('div');
    const source = writable(
      fchild({ id: 'child', tag: 'a', attr: { href: '/safe' }, style: { color: 'red' } })
    );
    const component = mount(Harness, { target, props: { source } });
    flushSync();
    const original = target.querySelector('a');
    expect(original?.getAttribute('href')).toBe('/safe');

    // act
    source.set(
      fchild({
        id: 'child',
        tag: 'a',
        attr: hostileAttributes as unknown as FChildParams['attr'],
        style: { color: 'expression(bad)', position: 'fixed' }
      })
    );
    flushSync();

    // assert
    const node = target.querySelector('a')!;
    expect(node.id).toBe('child');
    expect(node.className).toBe('oneput__fchild');
    expect(node.getAttribute('href')).toBeNull();
    expect(node.getAttribute('onclick')).toBeNull();
    expect(node.getAttribute('srcdoc')).toBeNull();
    expect(node.getAttribute('style') ?? '').toBe('');
    expect(node).toBe(original);

    // act
    source.set(fchild({ id: 'child', tag: 'a' }));
    flushSync();

    // assert
    expect(node.getAttribute('href')).toBeNull();
    expect(node.getAttribute('style') ?? '').toBe('');
    unmount(component);
  });

  test('Flex: nested forbidden tags and attributes', () => {
    // arrange
    const target = document.createElement('div');
    const props = hflex({
      id: 'outer',
      tag: 'script',
      attr: hostileAttributes as unknown as FlexParams['attr'],
      children: [
        hflex({
          id: 'inner',
          tag: 'iframe',
          children: [
            fchild({
              id: 'leaf',
              tag: 'img',
              attr: {
                src: 'data:image/svg+xml,bad',
                onerror: 'bad'
              } as unknown as FChildParams['attr']
            })
          ]
        })
      ]
    });

    // act
    const component = mount(Flex, { target, props: { ...props, class: '' } });
    flushSync();

    // assert
    expect(target.querySelector('script,iframe')).toBeNull();
    expect(target.querySelector('#outer')?.tagName).toBe('DIV');
    expect(target.querySelector('#inner')?.tagName).toBe('DIV');
    expect(target.querySelector('[src],[onclick],[onerror],[srcdoc]')).toBeNull();
    unmount(component);
  });

  test('SafeHtml insertion and forged value', () => {
    // arrange
    const target = document.createElement('div');
    const result = sanitiseHtml('<b>hello</b><img src=x onerror=bad>');
    if (result.isErr()) throw result.error;

    // act
    const source = writable(fchild({ id: 'rich', htmlContent: result.value }));
    const component = mount(Harness, { target, props: { source } });
    flushSync();

    // assert
    expect(target.querySelector('b')?.textContent).toBe('hello');
    expect(target.querySelector('img')).toBeNull();

    // act
    source.set(
      fchild({ id: 'rich', htmlContent: '<img src=x onerror=bad>' as unknown as SafeHtml })
    );
    flushSync();

    // assert
    expect(target.textContent).toBe('Content unavailable');
    expect(target.querySelector('img,b')).toBeNull();

    // act
    source.set(fchild({ id: 'rich', textContent: '<b>plain</b>' }));
    flushSync();

    // assert
    expect(target.textContent).toBe('<b>plain</b>');
    expect(target.querySelector('b')).toBeNull();
    unmount(component);
  });
});

describe('DOM refusal cases', () => {
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
  ])('tag: %s', (tag) => {
    // arrange
    const target = document.createElement('div');
    const source = writable(
      hflex({ id: 'target', tag, children: [fchild({ textContent: 'safe text' })] })
    );

    // act
    const component = mount(Harness, { target, props: { source } });
    flushSync();

    // assert
    expect(target.querySelector('#target')?.tagName).toBe('DIV');
    expect(target.querySelector(tag)).toBeNull();
    expect(target.textContent).toBe('safe text');
    unmount(component);
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
    'is',
    'unknown'
  ])('attribute: %s', (name) => {
    // arrange
    const target = document.createElement('div');
    const source = writable(
      fchild({
        id: 'target',
        tag: 'a',
        attr: { [name]: 'javascript:bad' } as unknown as FChildParams['attr']
      })
    );

    // act
    const component = mount(Harness, { target, props: { source } });
    flushSync();

    // assert
    expect(target.querySelector('#target')?.hasAttribute(name)).toBe(false);
    unmount(component);
  });

  for (const [tag, attribute] of [
    ['a', 'href'],
    ['img', 'src']
  ]) {
    test.each([
      'javascript:bad',
      'JaVaScRiPt:bad',
      'java\nscript:bad',
      'data:text/html,bad',
      'data:image/png;base64,AAAA',
      'vbscript:bad',
      'file:///tmp/a',
      'blob:https://example.com/a',
      '\\evil.com/a'
    ])(`${tag} URL: %s`, (url) => {
      // arrange
      const target = document.createElement('div');
      const source = writable(fchild({ id: 'target', tag, attr: { [attribute]: '/safe' } }));
      const component = mount(Harness, { target, props: { source } });
      flushSync();

      // act
      source.set(fchild({ id: 'target', tag, attr: { [attribute]: url } }));
      flushSync();

      // assert
      expect(target.querySelector('#target')?.hasAttribute(attribute)).toBe(false);
      unmount(component);
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
  ])('style: %s=%s', (name, value) => {
    // arrange
    const target = document.createElement('div');
    const source = writable(hflex({ id: 'target', style: { color: 'red' } }));
    const component = mount(Harness, { target, props: { source } });
    flushSync();

    // act
    source.set(hflex({ id: 'target', style: { [name]: value } }));
    flushSync();

    // assert
    expect(target.querySelector('#target')?.getAttribute('style') ?? '').toBe('');
    unmount(component);
  });

  test('function handler remains a code API', () => {
    // arrange
    const target = document.createElement('div');
    const output = document.createElement('span');
    const source = writable(
      fchild({
        tag: 'button',
        attr: {
          onclick: () => {
            output.textContent = 'selected';
          }
        }
      })
    );
    const component = mount(Harness, { target, props: { source } });
    flushSync();

    // act
    target.querySelector('button')!.click();

    // assert
    expect(output.textContent).toBe('selected');
    expect(target.querySelector('button')?.hasAttribute('onclick')).toBe(false);
    unmount(component);
  });
});

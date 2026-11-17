import { describe, expect, test } from 'vitest';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { SafeHtml } from '@oneput/safe-html';
import type { FChildParams, FlexRealChild } from '../../src/lib/oneput/types.js';

// Import the emitted bundle, including its compiled Svelte runtime and components.
const bundleUrl = pathToFileURL(resolve('.test-results/safe-html-production/entry.js'));
const { mount, unmount, flushSync, writable, Harness, fchild, hflex, sanitiseHtml, development } =
  (await import(/* @vite-ignore */ bundleUrl.href)) as typeof import('./entry.js');

describe('production build refusal', () => {
  test('mount and update', () => {
    // arrange
    const target = document.createElement('div');
    const source = writable<FlexRealChild>(
      hflex({
        id: 'outer',
        tag: 'script',
        children: [
          fchild({
            id: 'child',
            tag: 'a',
            attr: { onclick: 'bad()', href: 'javascript:bad()' } as unknown as FChildParams['attr'],
            style: { position: 'fixed', color: 'expression(bad)' },
            textContent: 'safe text'
          })
        ]
      })
    );

    // act
    const component = mount(Harness, { target, props: { source } });
    flushSync();

    // assert
    expect(development).toBe(false);
    expect(target.querySelector('#outer')?.tagName).toBe('DIV');
    expect(target.querySelector('script,[onclick],[href],[style]')).toBeNull();
    expect(target.textContent).toBe('safe text');

    // act
    source.set(
      fchild({
        id: 'updated',
        tag: 'img',
        attr: { src: 'data:text/html,bad', onerror: 'bad()' } as unknown as FChildParams['attr'],
        style: { position: 'fixed', backgroundImage: 'url(/bad)' }
      })
    );
    flushSync();

    // assert
    expect(target.querySelector('#updated')?.tagName).toBe('IMG');
    expect(target.querySelector('[src],[onerror],[style]')).toBeNull();

    // act
    source.set(fchild({ id: 'rich', htmlContent: '<b>forged</b>' as unknown as SafeHtml }));
    flushSync();

    // assert
    expect(target.textContent).toBe('Content unavailable');
    expect(target.querySelector('b')).toBeNull();

    // act
    const result = sanitiseHtml('<strong>checked</strong><img src=x onerror=bad>');
    if (result.isErr()) throw result.error;
    source.set(fchild({ id: 'rich', htmlContent: result.value }));
    flushSync();

    // assert
    expect(target.querySelector('strong')?.textContent).toBe('checked');
    expect(target.querySelector('img')).toBeNull();
    unmount(component);
  });
});

import { render } from 'svelte/server';
import { describe, expect, test } from 'vitest';
import { fchild, hflex } from '@oneput/oneput';
import Flex from '@oneput/oneput/shared/components/Flex.svelte';
import { sessionDetailsMenuItem } from './tomatoTimer/sessionDetailsMenuItem.js';
import type { FinishedSessionRecord } from './tomatoTimer/idb.js';

describe('server content rendering', () => {
  test('timer label remains text', () => {
    // arrange
    const session: FinishedSessionRecord = {
      id: 1,
      label: '<img src=x onerror=bad> & label',
      startTime: 1,
      endTime: 61,
      duration: 60,
      pauseDuration: 0,
      pauseStartTime: null,
      note: null
    };
    const item = sessionDetailsMenuItem(session, 60);

    // act
    const { body } = render(Flex, { props: { ...item, class: '' } });

    // assert
    expect(body).toContain('&lt;img src=x onerror=bad> &amp; label');
    expect(body).not.toContain('<img');
    expect(body).toContain('<h3');
  });

  test('server trees use the same tag, attribute, URL, and style policy', () => {
    // arrange
    const tree = hflex({
      id: 'outer',
      tag: 'script',
      attr: { srcdoc: 'bad', onclick: 'bad' },
      style: { position: 'fixed' },
      children: [
        fchild({ id: 'link', tag: 'a', attr: { href: 'javascript:bad' }, textContent: 'link' })
      ]
    });

    // act
    const { body } = render(Flex, { props: { ...tree, class: '' } });

    // assert
    expect(body).not.toContain('<script');
    expect(body).not.toContain('srcdoc=');
    expect(body).not.toContain('onclick=');
    expect(body).not.toContain('javascript:');
    expect(body).not.toContain('position:fixed');
    expect(body).toContain('link');
  });
});

test('raw-text tags cannot change the parsing context', () => {
  // arrange
  const tree = hflex({
    id: 'outer',
    tag: 'textarea',
    children: [
      fchild({
        id: 'caption',
        classes: ['</textarea><img src=x onerror=bad>'],
        textContent: 'text'
      })
    ]
  });

  // act
  const { body } = render(Flex, { props: { ...tree, class: '' } });

  // assert
  expect(body).not.toContain('<textarea');
  expect(body).toContain('<div');
});

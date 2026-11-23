// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { describe, expect, test } from 'vitest';
import { sanitiseHtml, type SafeHtml } from '@oneput/safe-html';
import { Controller } from '../../controllers/controller.js';
import { fchild, hflex } from '../../lib/builder.js';
import type { FChildParams } from '../../types.js';
import { Alert } from './Alert.js';
import { Confirm } from './Confirm.js';
import { Notification } from './Notification.js';
import type { Message } from './Message.js';
import Flex from '../components/Flex.svelte';

const cases: { name: string; message: () => Message; text: string; rich: boolean }[] = [
  { name: 'text', message: () => '<b>Saved</b>', text: '<b>Saved</b>', rich: false },
  {
    name: 'SafeHtml',
    message: () => {
      const result = sanitiseHtml(
        '<strong>Saved</strong><a href="/help">Help</a><script>bad</script>',
        'display'
      );
      if (result.isErr()) throw result.error;
      return result.value;
    },
    text: 'SavedHelp',
    rich: true
  },
  {
    name: 'builder child',
    message: () => fchild({ tag: 'strong', textContent: 'Saved' }),
    text: 'Saved',
    rich: true
  },
  {
    name: 'builder children',
    message: () => [
      fchild({ tag: 'strong', textContent: 'Saved' }),
      hflex({ children: [fchild({ tag: 'a', textContent: 'Help', attr: { href: '/help' } })] })
    ],
    text: 'SavedHelp',
    rich: true
  },
  {
    name: 'forged SafeHtml',
    message: () => ({}) as SafeHtml,
    text: 'Content unavailable',
    rich: false
  },
  {
    name: 'checked builder writes',
    message: () => [
      fchild({
        tag: 'script',
        textContent: 'Saved',
        attr: { onclick: 'bad' } as unknown as FChildParams['attr']
      })
    ],
    text: 'Saved',
    rich: false
  }
];

for (const Kind of [Alert, Confirm, Notification]) {
  describe(Kind.name, () => {
    for (const example of cases) {
      test(example.name, async () => {
        // arrange
        const ctl = Controller.createNull();
        const target = document.createElement('div');
        const message = example.message();
        const ui =
          Kind === Notification
            ? new Notification(ctl)
            : Kind === Alert
              ? new Alert(ctl, { message, additional: message })
              : new Confirm(ctl, { message, additional: message });

        // act
        if (ui instanceof Notification) ui.run(message);
        else void ui.run();
        const tree = ctl.currentProps.replaceMenuUI?.menu ?? ctl.currentProps.injectUI?.inner;
        if (!tree) throw new Error('Message UI is missing');
        const component = mount(Flex, { target, props: { ...tree, class: '' } });
        flushSync();

        // assert
        const main =
          Kind === Notification
            ? target.querySelector('#oneput-notification')?.firstElementChild
            : target.querySelector('h2');
        expect(main?.textContent).toBe(example.text);
        expect(Boolean(main?.querySelector('strong'))).toBe(example.rich);
        if (Kind !== Notification) {
          const additional = target.querySelector('h2')?.nextElementSibling;
          expect(additional?.textContent).toBe(example.text);
          expect(Boolean(additional?.querySelector('strong'))).toBe(example.rich);
          expect(additional?.tagName).toBe(typeof message === 'string' ? 'P' : 'DIV');
        }
        if (example.text === 'SavedHelp') {
          expect(main?.querySelector('a')?.getAttribute('href')).toBe('/help');
        }
        expect(target.querySelector('b,script,[onclick]')).toBeNull();

        await unmount(component);
        ctl._destroy();
      });
    }
  });
}

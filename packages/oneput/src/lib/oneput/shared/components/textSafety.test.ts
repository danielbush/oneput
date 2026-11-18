import { flushSync, mount, unmount } from 'svelte';
import { describe, expect, test } from 'vitest';
import { fchild, menuItem } from '../../lib/builder.js';
import { WordFilter } from '../filters/WordFilter.js';
import { FuzzyFilter } from '../filters/FuzzyFilter.js';
import { Controller } from '../../controllers/controller.js';
import { Alert } from '../ui/Alert.js';
import { setTimeMenuItem } from '../ui/menuItems/setTimeMenuItem.js';
import { chatSessionItem } from '../ui/menuItems/chatSessionItem.js';
import { stdSkeletonMenuItems } from '../ui/menuItems/stdSkeletonMenuItems.js';
import { hflex } from '../../lib/builder.js';
import Flex from './Flex.svelte';
import FChild from './FChild.svelte';

const hostile = '<img src=x onerror=alert(1)> & hello';

describe('text rendering', () => {
  for (const Filter of [WordFilter, FuzzyFilter]) {
    test(`${Filter.name}: hostile label and cleared highlight`, () => {
      // arrange
      const child = fchild({ textContent: hostile });
      const items = [menuItem({ children: [child] })];
      const filter = new Filter();
      const target = document.createElement('div');

      // act
      filter.filter('hello', items);
      const component = mount(FChild, { target, props: child });
      flushSync();

      // assert
      expect(target.textContent).toBe(hostile);
      expect(target.querySelector('img')).toBeNull();
      expect(target.querySelector('b')?.textContent).toBe('hello');

      // act
      filter.filter('', items);

      // assert
      expect(child.textSegments).toBeUndefined();
      unmount(component);
    });
  }

  test('Alert: messages remain text', () => {
    // arrange
    const ctl = Controller.createNull();
    const alert = new Alert(ctl, { message: hostile, additional: hostile });
    const target = document.createElement('div');

    // act
    alert.run();
    const component = mount(Flex, {
      target,
      props: { ...ctl.currentProps.replaceMenuUI!.menu!, class: '' }
    });
    flushSync();

    // assert
    expect(target.querySelector('h2')?.textContent).toBe(hostile);
    expect(target.querySelector('p')?.textContent).toBe(hostile);
    expect(target.querySelector('img')).toBeNull();
    alert.cancel();
    unmount(component);
  });
});

describe('fixed UI structure', () => {
  test('hour labels and chat turns remain text', () => {
    // arrange
    const target = document.createElement('div');
    const time = setTimeMenuItem({
      id: 'time',
      hour: 12,
      minute: 30,
      hourLabel: hostile,
      adjustHour: (hour) => hour,
      adjustMinute: (minute) => minute,
      stepQuarter: (hour, minute) => ({ hour, minute })
    });
    const chat = chatSessionItem({
      id: 'chat',
      turns: [{ role: 'agent', text: hostile }],
      busy: true
    });
    const tree = hflex({ children: [time, chat, ...stdSkeletonMenuItems(2)] });

    // act
    const component = mount(Flex, { target, props: { ...tree, class: '' } });
    flushSync();

    // assert
    expect(target.querySelector('.oneput__set-time-hour-label')?.textContent).toBe(hostile);
    expect(target.querySelector('.oneput__chat-session-bubble')?.textContent).toBe(hostile);
    expect(target.querySelector('img,script')).toBeNull();
    expect(target.querySelectorAll('.oneput__chat-session-dot')).toHaveLength(3);
    expect(target.querySelectorAll('.oneput__menu-item-skeleton--bar')).toHaveLength(2);
    unmount(component);
  });
});

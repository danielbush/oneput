import { describe, expect, it } from 'vitest';
import { Controller } from './controller.js';
import { stdMenuItem } from '../shared/ui/menuItems/stdMenuItem.js';
import { WordFilter } from '../shared/filters/WordFilter.js';

const item = (id: string, text: string, canFilter?: boolean) =>
  stdMenuItem({ id, textContent: text, canFilter, action: () => {} });

const inputChangePayload = {
  evt: new InputEvent('input'),
  value: 'a',
  beforeValue: '',
  range: [1, 1] as [number, number],
  beforeRange: [0, 0] as [number, number],
  cause: 'user' as const
};

describe('MenuController', () => {
  it('keeps menu focus behaviour when filtering redisplays the current menu', () => {
    // arrange
    const ctl = Controller.createNull({ menuOpen: true, inputValue: 'a' });
    ctl.app.run({ onStart: () => {} });
    ctl.menu.setDefaultFilter(WordFilter.create().filter);
    ctl.menu.setMenu({
      id: 'main',
      focusBehaviour: 'first',
      items: [item('apple', 'Apple'), item('apricot', 'Apricot')]
    });
    ctl.menu.focusMenuItemById('apricot');
    ctl.menu.doMenuAction();

    // act
    ctl.events.emit({ type: 'input-change', payload: inputChangePayload });

    // assert
    expect(ctl.currentProps.menuItems?.map((menuItem) => menuItem.id)).toEqual([
      'apple',
      'apricot'
    ]);
    expect(ctl.currentProps.menuItemFocus).toEqual([0, true]);
  });

  it('uses ambient focus behaviour when the current menu has none', () => {
    // arrange
    const ctl = Controller.createNull({ menuOpen: true, inputValue: '' });
    ctl.app.run({ onStart: () => {} });
    ctl.menu.setDefaultFilter(WordFilter.create().filter);
    ctl.menu.setFocusBehaviour('last');
    ctl.menu.setMenu({
      id: 'main',
      items: [item('apple', 'Apple'), item('apricot', 'Apricot')]
    });

    // act
    ctl.events.emit({ type: 'input-change', payload: inputChangePayload });

    // assert
    expect(ctl.currentProps.menuItemFocus).toEqual([1, true]);
  });

  it('focuses the first filter match instead of a pinned visible item', () => {
    // arrange
    const ctl = Controller.createNull({ menuOpen: true });
    ctl.app.run({ onStart: () => {} });
    ctl.currentProps.inputValue = 'app';
    ctl.menu.setDefaultFilter(WordFilter.create().filter);
    ctl.menu.setMenu({
      id: 'main',
      focusBehaviour: 'first',
      items: [item('up', '..', false), item('apple', 'Apple'), item('banana', 'Banana')]
    });

    // act
    ctl.events.emit({ type: 'input-change', payload: { ...inputChangePayload, value: 'app' } });

    // assert
    expect(ctl.currentProps.menuItems?.map((menuItem) => menuItem.id)).toEqual(['up', 'apple']);
    expect(ctl.currentProps.menuItemFocus).toEqual([1, true]);
  });

  it('uses generative mode instead of the base menu', () => {
    // arrange
    const ctl = Controller.createNull({ menuOpen: true, inputValue: '' });
    ctl.app.run({ onStart: () => {} });
    ctl.menu.setDefaultFilter(WordFilter.create().filter);
    ctl.menu.setMenu({
      id: 'base',
      items: [item('apple', 'Apple'), item('banana', 'Banana')]
    });

    // act
    ctl.menu.setGenerativeAsync(async () => [item('generated', 'Generated')], {
      whenEmpty: () => [item('generated-empty', 'Generated empty')]
    });

    // assert
    expect(ctl.currentProps.menuItems?.map((menuItem) => menuItem.id)).toEqual(['generated-empty']);
  });

  it('uses filter mode instead of a previous generative listener', () => {
    // arrange
    const ctl = Controller.createNull({ menuOpen: true, inputValue: 'app' });
    ctl.app.run({ onStart: () => {} });
    ctl.menu.setGenerativeAsync(async () => [item('generated', 'Generated')], {
      whenEmpty: () => [item('generated-empty', 'Generated empty')]
    });
    ctl.menu.setFilter(WordFilter.create().filter);
    ctl.input.setInputValue('app');
    ctl.menu.setMenu({
      id: 'base',
      items: [item('apple', 'Apple'), item('banana', 'Banana')]
    });

    // act
    ctl.events.emit({ type: 'input-change', payload: { ...inputChangePayload, value: '' } });

    // assert
    expect(ctl.currentProps.menuItems?.map((menuItem) => menuItem.id)).toEqual(['apple']);
  });
});

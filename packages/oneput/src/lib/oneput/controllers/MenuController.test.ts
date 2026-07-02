import { describe, expect, it } from 'vitest';
import { Controller } from './controller.js';
import { stdMenuItem } from '../shared/ui/menuItems/stdMenuItem.js';
import { WordFilter } from '../shared/filters/WordFilter.js';

const item = (id: string, text: string) => stdMenuItem({ id, textContent: text, action: () => {} });

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
    ctl.events.emit({
      type: 'menu-action',
      payload: {
        menuId: 'main',
        menuActionId: 'apricot'
      }
    });

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
    const ctl = Controller.createNull({ menuOpen: true, inputValue: 'a' });
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
});

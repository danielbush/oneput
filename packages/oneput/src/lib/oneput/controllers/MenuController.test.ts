import { describe, expect, it, test } from 'vitest';
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
  describe('focusBehaviour', () => {
    test('(first) filtering / redisplay - keeps menu focus behaviour when filtering redisplays the current menu', () => {
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

    test('(last) filtering / filtered out - uses ambient focus behaviour when the current menu has none', () => {
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

    test('(first) filtering / pinning - focuses the first filter match instead of a pinned visible item', () => {
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

    test('(none) ignored items / leading - moves off a leading ignored item', () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({ onStart: () => {} });
      ctl.menu.openMenu();

      // act
      ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'none',
        items: [
          { ...item('chat', 'Chat'), ignored: true },
          item('back', 'Back'),
          item('clear', 'Clear')
        ]
      });

      // assert
      expect(ctl.currentProps.menuItemFocus).toEqual([1, true]);
    });

    test('(none) ignored items - keeps focus on a focusable item', () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({ onStart: () => {} });
      ctl.menu.openMenu();
      ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'none',
        items: [
          { ...item('chat', 'Chat'), ignored: true },
          item('back', 'Back'),
          item('clear', 'Clear')
        ]
      });
      ctl.menu.focusMenuItemById('clear');

      // act
      ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'none',
        items: [
          { ...item('chat', 'Chat'), ignored: true },
          item('back', 'Back'),
          item('clear', 'Clear')
        ]
      });

      // assert
      expect(ctl.currentProps.menuItemFocus).toEqual([2, true]);
    });

    // AddEntry-style: filter channel present but disabled; onMenuItemFocus syncs
    // the input from app state. Without the input-change guard, setDisplayed
    // re-runs last-action,first and clears the just-typed character.
    test('filter disabled - typing does not re-run menu focus / clear input', () => {
      // arrange
      let label = '';
      const ctl = Controller.createNull({ menuOpen: true, inputValue: '' });
      ctl.menu.setDefaultFilter(WordFilter.create().filter);
      ctl.app.run({
        settings: { enableFilter: false },
        onMenuItemFocus: ({ menuItem }) => {
          if (menuItem?.id === 'label') {
            ctl.input.setInputValue(label);
          }
        },
        onStart: () => {
          ctl.menu.setMenu({
            id: 'main',
            focusBehaviour: 'last-action,first',
            items: [item('label', 'Label...'), item('other', 'Other')]
          });
        }
      });
      ctl.events.on('input-change', ({ value }) => {
        label = value;
      });

      // act
      ctl.input.setInputValue('a');
      ctl.events.emit({
        type: 'input-change',
        payload: { ...inputChangePayload, value: 'a' }
      });

      // assert
      expect(ctl.input.getInputValue()).toBe('a');
      expect(label).toBe('a');
    });
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

  describe('menu chrome', () => {
    it('writes header/footer onto menuUI from setMenu', () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({ onStart: () => {} });

      // act
      ctl.menu.setMenu({
        id: 'main',
        items: [item('a', 'A')],
        header: { id: 'h', type: 'hflex', children: [] },
        footer: { id: 'f', type: 'hflex', children: [] }
      });

      // assert
      expect(ctl.currentProps.menuUI?.header?.id).toBe('h');
      expect(ctl.currentProps.menuUI?.footer?.id).toBe('f');
    });

    it('preserves menu chrome across ui.update layout rebuild', () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({
        layout: {
          layout: () => ({
            configure() {},
            get menuUI() {
              return { layoutHeader: { id: 'lh', type: 'hflex' as const, children: [] } };
            }
          }),
          params: { menuTitle: 'T' }
        },
        onStart: () => {}
      });
      ctl.menu.setMenu({
        id: 'main',
        items: [item('a', 'A')],
        footer: { id: 'f', type: 'hflex', children: [] }
      });

      // act
      ctl.ui.update({ params: { menuTitle: 'T2' } });

      // assert
      expect(ctl.currentProps.menuUI?.layoutHeader?.id).toBe('lh');
      expect(ctl.currentProps.menuUI?.footer?.id).toBe('f');
    });

    it('clears menu chrome when setMenu() clears', () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({ onStart: () => {} });
      ctl.menu.setMenu({
        id: 'main',
        items: [item('a', 'A')],
        footer: { id: 'f', type: 'hflex', children: [] }
      });

      // act
      ctl.menu.setMenu();

      // assert
      expect(ctl.currentProps.menuUI?.footer).toBeUndefined();
    });
  });
});

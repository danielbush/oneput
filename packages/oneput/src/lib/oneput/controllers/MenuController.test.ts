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
  describe('menu updates', () => {
    it('rebuilds a declarative menu once for several invalidations', async () => {
      // arrange
      let menuBuildCount = 0;
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({
        onStart: () => {},
        menu: () => {
          menuBuildCount += 1;
          return { id: 'main', items: [item('action', 'Action')] };
        }
      });

      // act
      const results = await Promise.all([
        ctl.menu.invalidate(),
        ctl.menu.invalidate(),
        ctl.menu.invalidate({ focusBehaviour: 'none' })
      ]);

      // assert
      expect(results).toEqual([true, true, true]);
      expect(menuBuildCount).toBe(1);
    });

    it('does not rebuild when closing is requested before an invalidation runs', async () => {
      // arrange
      let menuBuildCount = 0;
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({
        onStart: () => {},
        menu: () => {
          menuBuildCount += 1;
          return { id: 'main', items: [item('action', 'Action')] };
        }
      });

      // act
      const result = ctl.menu.invalidate();
      ctl.menu.closeMenu();

      // assert
      await expect(result).resolves.toBe(false);
      expect(menuBuildCount).toBe(0);
    });

    it('emits one open event for repeated open requests', async () => {
      // arrange
      const menuOpenChanges: boolean[] = [];
      const ctl = Controller.createNull();
      ctl.app.run({ onStart: () => {} });
      ctl.events.on('menu-open-change', (open) => menuOpenChanges.push(open));

      // act
      ctl.menu.openMenu();
      ctl.menu.openMenu();
      await new Promise((resolve) => setTimeout(resolve));

      // assert
      expect(menuOpenChanges).toEqual([true]);
    });

    it('refreshes declarative rows before the menu opens', async () => {
      // arrange
      let maximized = false;
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({
        onStart: () => {},
        menu: () => ({
          id: 'frame-actions',
          items: maximized
            ? [item('unmaximize', 'Unmaximize node')]
            : [item('zoom-in', 'Zoom in'), item('fit-view', 'Fit graph in view')]
        })
      });
      await ctl.menu.invalidate();
      ctl.menu.closeMenu();
      await new Promise((resolve) => setTimeout(resolve));
      maximized = true;

      const rowsWhenOpened: string[][] = [];
      ctl.events.on('menu-open-change', (open) => {
        if (!open) return;
        rowsWhenOpened.push(ctl.currentProps.menuItems?.map((menuItem) => menuItem.id) ?? []);
      });

      // act
      ctl.menu.openMenu();
      await new Promise((resolve) => setTimeout(resolve));

      // assert
      expect(rowsWhenOpened).toEqual([['unmaximize']]);
    });

    it('emits one close event for repeated close requests', async () => {
      // arrange
      const menuOpenChanges: boolean[] = [];
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({ onStart: () => {} });
      ctl.events.on('menu-open-change', (open) => menuOpenChanges.push(open));

      // act
      ctl.menu.closeMenu();
      ctl.menu.closeMenu();
      await new Promise((resolve) => setTimeout(resolve));

      // assert
      expect(menuOpenChanges).toEqual([false]);
    });
  });

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

  /**
   * `enableMenuItemFocus: false` turns the synthetic menu focus off. See
   * ENTER_SEMANTICS in `docs/CONCEPTS.md`.
   */
  describe('enableMenuItemFocus', () => {
    const focuslessMenu = () => {
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({ onStart: () => {}, settings: { enableMenuItemFocus: false } });
      ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'first',
        items: [item('a', 'A'), item('b', 'B')]
      });
      return ctl;
    };

    test('off - focus behaviour leaves no focused item', () => {
      // arrange / act
      const ctl = focuslessMenu();

      // assert
      expect(ctl.currentProps.menuItemFocus).toEqual([-1, false]);
    });

    test('off - focusNextMenuItem does nothing', () => {
      // arrange
      const ctl = focuslessMenu();

      // act
      ctl.menu.focusNextMenuItem();

      // assert
      expect(ctl.currentProps.menuItemFocus).toEqual([-1, false]);
    });

    test('off - doMenuAction finds no item', () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      const actioned: string[] = [];
      ctl.app.run({ onStart: () => {}, settings: { enableMenuItemFocus: false } });
      ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'first',
        items: [stdMenuItem({ id: 'a', textContent: 'A', action: () => actioned.push('a') })]
      });

      // act
      ctl.menu.doMenuAction();

      // assert
      expect(actioned).toEqual([]);
    });

    test('off - a click still runs the clicked item', () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      const actioned: string[] = [];
      ctl.app.run({ onStart: () => {}, settings: { enableMenuItemFocus: false } });
      ctl.menu.setMenu({
        id: 'main',
        items: [
          stdMenuItem({ id: 'a', textContent: 'A', action: () => actioned.push('a') }),
          stdMenuItem({ id: 'b', textContent: 'B', action: () => actioned.push('b') })
        ]
      });
      const clicked = ctl.currentProps.menuItems![1];

      // act
      ctl.currentProps.onMenuAction?.(new Event('pointerup'), clicked, 1);

      // assert
      expect(actioned).toEqual(['b']);
    });

    test('turned back on - focus returns', () => {
      // arrange
      const ctl = focuslessMenu();

      // act
      ctl.ui.update({ flags: { enableMenuItemFocus: true } });

      // assert
      expect(ctl.currentProps.menuItemFocus).toEqual([0, true]);
    });

    test('on - a textarea does not change the focus', () => {
      // arrange
      const ctl = Controller.createNull({ menuOpen: true });
      ctl.app.run({ onStart: () => {} });
      ctl.menu.setMenu({
        id: 'main',
        focusBehaviour: 'first',
        items: [item('a', 'A'), item('b', 'B')]
      });
      ctl.menu.focusMenuItemById('b');

      // act
      ctl.ui.setInputUI({ textArea: { rows: 5 } });

      // assert
      expect(ctl.currentProps.menuItemFocus).toEqual([1, true]);
    });
  });
});

import { describe, expect, test } from 'vitest';
import { Controller } from '../../controllers/controller.js';
import { OneputAction } from './OneputAction.js';
import { OneputCatalog } from './OneputCatalog.js';

describe('OneputCatalog', () => {
  test('filtered actions', () => {
    // arrange
    const ctl = Controller.createNull();
    const catalog = OneputCatalog.create(ctl).filter([
      OneputAction.FOCUS_INPUT,
      OneputAction.TOGGLE_SELECTION
    ]);

    // act
    const actions = catalog.getActions();

    // assert
    expect(Object.keys(actions)).toEqual([OneputAction.FOCUS_INPUT, OneputAction.TOGGLE_SELECTION]);
    expect(actions[OneputAction.FOCUS_INPUT].binding?.bindings).toEqual([`$mod+'`, `Control+'`]);
    expect(actions[OneputAction.TOGGLE_SELECTION].binding).toEqual({
      bindings: ['$mod+e'],
      description: 'Toggle input selection',
      when: { menuOpen: false }
    });
  });

  test('menu items come from selected catalog entries', () => {
    // arrange
    const ctl = Controller.createNull();
    const catalog = OneputCatalog.create(ctl).filter([OneputAction.SUBMIT]);

    // act
    const items = catalog.getMenuItems([OneputAction.SUBMIT, OneputAction.EXIT]);

    // assert
    expect(items.map((item) => item && item.id)).toEqual(['SUBMIT', undefined]);
  });

  test('menu actions delegate to oneput controllers', async () => {
    // arrange
    const ctl = Controller.createNull();
    const catalog = OneputCatalog.create(ctl);
    const actions = catalog.getActions();

    // act
    actions[OneputAction.OPEN_MENU].action(ctl);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const open = ctl.menu.isMenuOpen;
    actions[OneputAction.CLOSE_MENU].action(ctl);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // assert
    expect(open).toBe(true);
    expect(ctl.menu.isMenuOpen).toBe(false);
  });
});

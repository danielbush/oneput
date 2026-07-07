import { Controller } from '@oneput/oneput';
import { describe, expect, test } from 'vitest';
import { Editor } from '../../../editor/Editor.js';
import { makeRoot } from '../../../test/util.js';
import { JsedCatalog } from '../JsedCatalog.js';
import { JsedAction } from '../JsedAction.js';

describe('EditorActionCatalog', () => {
  test('filtered menu items', () => {
    // arrange
    const document = makeRoot('<p id="p1">foo</p>');
    const ctl = Controller.createNull();
    const editor = Editor.createNull({ document, userInput: ctl.input });
    const catalog = JsedCatalog.create(ctl, editor).filter([JsedAction.PASTE_BEFORE]);

    // act
    const items = catalog.getMenuItems([JsedAction.PASTE_BEFORE, JsedAction.PASTE_AFTER]);

    // assert
    expect(items.map((item) => item && item.id)).toEqual(['PASTE_BEFORE', undefined]);
  });

  test('filtered actions', () => {
    // arrange
    const document = makeRoot('<p id="p1">foo</p>');
    const ctl = Controller.createNull();
    const editor = Editor.createNull({ document, userInput: ctl.input });
    const catalog = JsedCatalog.create(ctl, editor).filter([JsedAction.PASTE_BEFORE]);

    // act
    const actions = catalog.getActions();

    // assert
    expect(Object.keys(actions)).toEqual([JsedAction.PASTE_BEFORE]);
  });

  test('menu item predicates', () => {
    // arrange
    const document = makeRoot('<p id="p1">foo</p>');
    const ctl = Controller.createNull();
    const editor = Editor.createNull({ document, userInput: ctl.input });
    const catalog = JsedCatalog.create(ctl, editor).filter([JsedAction.UNDO]);

    // act
    const actions = catalog.getActions();
    const items = catalog.getMenuItems([JsedAction.UNDO]);

    // assert
    expect(actions[JsedAction.UNDO]).toBeDefined();
    expect(items).toEqual([undefined]);
  });
});

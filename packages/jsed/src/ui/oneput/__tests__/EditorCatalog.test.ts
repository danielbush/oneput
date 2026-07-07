import { Controller } from '@oneput/oneput';
import { describe, expect, test } from 'vitest';
import { Editor } from '../../../editor/Editor.js';
import { makeRoot } from '../../../test/util.js';
import { JsedCatalog } from '../JsedCatalog.js';
import { JsedCommand } from '../JsedCommand.js';

describe('EditorActionCatalog', () => {
  test('filtered menu items', () => {
    // arrange
    const document = makeRoot('<p id="p1">foo</p>');
    const ctl = Controller.createNull();
    const editor = Editor.createNull({ document, userInput: ctl.input });
    const catalog = JsedCatalog.create(ctl, editor).filter([JsedCommand.PASTE_BEFORE]);

    // act
    const items = catalog.getMenuItems([JsedCommand.PASTE_BEFORE, JsedCommand.PASTE_AFTER]);

    // assert
    expect(items.map((item) => item && item.id)).toEqual(['PASTE_BEFORE', undefined]);
  });

  test('filtered actions', () => {
    // arrange
    const document = makeRoot('<p id="p1">foo</p>');
    const ctl = Controller.createNull();
    const editor = Editor.createNull({ document, userInput: ctl.input });
    const catalog = JsedCatalog.create(ctl, editor).filter([JsedCommand.PASTE_BEFORE]);

    // act
    const actions = catalog.getActions();

    // assert
    expect(Object.keys(actions)).toEqual([JsedCommand.PASTE_BEFORE]);
  });

  test('menu item predicates', () => {
    // arrange
    const document = makeRoot('<p id="p1">foo</p>');
    const ctl = Controller.createNull();
    const editor = Editor.createNull({ document, userInput: ctl.input });
    const catalog = JsedCatalog.create(ctl, editor).filter([JsedCommand.UNDO]);

    // act
    const actions = catalog.getActions();
    const items = catalog.getMenuItems([JsedCommand.UNDO]);

    // assert
    expect(actions[JsedCommand.UNDO]).toBeDefined();
    expect(items).toEqual([undefined]);
  });
});

import { Controller } from '@oneput/oneput';
import { describe, expect, test } from 'vitest';
import { Editor } from '../../../editor/Editor.js';
import { makeRoot } from '../../../test/util.js';
import { JsedActionProvider } from '../JsedActionProvider.js';
import { JsedAction } from '../JsedAction.js';

describe('JsedActionProvider', () => {
  test('filtered menu items', () => {
    // arrange
    const document = makeRoot('<p id="p1">foo</p>');
    const ctl = Controller.createNull();
    const editor = Editor.createNull({ document, userInput: ctl.input });
    const provider = JsedActionProvider.create(ctl, editor).filter([JsedAction.PASTE_BEFORE]);

    // act
    const items = provider.getMenuItems([JsedAction.PASTE_BEFORE, JsedAction.PASTE_AFTER]);

    // assert
    expect(items.map((item) => item && item.id)).toEqual(['PASTE_BEFORE', undefined]);
  });

  test('filtered actions', () => {
    // arrange
    const document = makeRoot('<p id="p1">foo</p>');
    const ctl = Controller.createNull();
    const editor = Editor.createNull({ document, userInput: ctl.input });
    const provider = JsedActionProvider.create(ctl, editor).filter([JsedAction.PASTE_BEFORE]);

    // act
    const actions = provider.getActions();

    // assert
    expect(Object.keys(actions)).toEqual([JsedAction.PASTE_BEFORE]);
  });

  test('menu item predicates', () => {
    // arrange
    const document = makeRoot('<p id="p1">foo</p>');
    const ctl = Controller.createNull();
    const editor = Editor.createNull({ document, userInput: ctl.input });
    const provider = JsedActionProvider.create(ctl, editor).filter([JsedAction.UNDO]);

    // act
    const actions = provider.getActions();
    const items = provider.getMenuItems([JsedAction.UNDO]);

    // assert
    expect(actions[JsedAction.UNDO]).toBeDefined();
    expect(items).toEqual([undefined]);
  });
});

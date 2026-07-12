import { Controller } from '@oneput/oneput';
import { describe, expect, it } from 'vitest';
import {
  byId,
  findTokenByText,
  identify,
  identifyChildren,
  makeRoot,
  p,
  s,
  t
} from '../../test/util.js';
import { Editor } from '../../editor/Editor.js';
import type { JsedDocument } from '../../JsedDocument.js';

function createNullEditor(doc: JsedDocument): Editor {
  return Editor.createNull({
    document: doc,
    userInput: Controller.createNull().input
  });
}

describe('undo / redo integration', () => {
  it('split-then-modify', () => {
    // arrange
    const doc = makeRoot(
      p(
        { id: 'p1' },
        t('one'), //
        s(),
        t('two'),
        s(),
        t('three')
      )
    );
    const editor = createNullEditor(doc);
    editor.start();
    editor.enterEditing(findTokenByText(doc.root, 'two'));

    // act
    const cursor = editor.getCursor();
    expect(cursor).toBeDefined();
    cursor?.splitAtToken();
    editor.exitEditing({ focusElement: byId(doc, 'p1') });
    editor.focusOps.insertNewAfter({ tagName: 'ul', children: [{ tagName: 'li' }] });

    // assert
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]', '[element:ul]', '[element:p]']);
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['one', '[nodeType=3:" "]', 'two']);
    expect(identify(doc.root.children[1]?.firstElementChild)).toBe('[element:li]');
    expect(identifyChildren(doc.root.children[2])).toEqual(['[nodeType=3:" "]', 'three']);

    // act
    editor.undo();
    editor.undo();

    // assert
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]']);
    expect(identifyChildren(byId(doc, 'p1'))).toEqual([
      'one',
      '[nodeType=3:" "]',
      'two',
      '[nodeType=3:" "]',
      'three'
    ]);

    // act
    editor.redo();
    editor.redo();

    // assert
    expect(identifyChildren(doc.root)).toEqual(['[element:p#p1]', '[element:ul]', '[element:p]']);
    expect(identifyChildren(byId(doc, 'p1'))).toEqual(['one', '[nodeType=3:" "]', 'two']);
    expect(identify(doc.root.children[1]?.firstElementChild)).toBe('[element:li]');
    expect(identifyChildren(doc.root.children[2])).toEqual(['[nodeType=3:" "]', 'three']);

    editor.destroy();
  });
});

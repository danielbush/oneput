import { describe, expect, test } from 'vitest';
import { Editor } from '../Editor.js';
import type { EditorElementChangeEvent } from '../lib/editor/EditorState.js';
import { JSED_TOKEN_CLASS } from '../lib/dom/constants.js';
import { byId, frag, makeRoot, p } from '../test/util.js';
import type { JsedDocument } from '../JsedDocument.js';
import { Controller } from '../../../oneput/src/lib/oneput/controllers/controller.js';

function createNullEditor(doc: JsedDocument): Editor {
  return Editor.createNull({
    document: doc,
    userInput: Controller.createNull().input
  });
}

describe('EditorFocusOps', () => {
  describe('insertNewAfter', () => {
    test('view mode', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
      const editor = createNullEditor(doc);
      const elementChanges: EditorElementChangeEvent[] = [];
      editor.eventsEmitter.subscribe({
        onElementChange: (event) => elementChanges.push(event)
      });
      editor.start();

      // act
      const inserted = editor.focus.insertNewAfter('p');

      // assert
      const children = Array.from(doc.root.children);
      expect(inserted).toBe(true);
      expect(children).toHaveLength(3);
      expect(children[1]?.tagName.toLowerCase()).toBe('p');
      expect(children[1]?.querySelector(`.${JSED_TOKEN_CLASS}`)).not.toBeNull();
      expect(editor.nav.getFocus()).toBe(children[1]);
      expect(elementChanges).toEqual([
        {
          type: 'focusable-inserted',
          element: children[1]
        }
      ]);

      editor.destroy();
    });

    test('edit mode no-op', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
      const editor = createNullEditor(doc);
      const elementChanges: EditorElementChangeEvent[] = [];
      editor.eventsEmitter.subscribe({
        onElementChange: (event) => elementChanges.push(event)
      });
      editor.start();
      editor.enterEditing(byId(doc, 'p1'));

      // act
      const inserted = editor.focus.insertNewAfter('p');

      // assert
      expect(inserted).toBe(false);
      expect(Array.from(doc.root.children)).toHaveLength(2);
      expect(editor.nav.getFocus()).toBe(byId(doc, 'p1'));
      expect(elementChanges).toEqual([]);

      editor.destroy();
    });

    test('document root no-op', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
      const editor = createNullEditor(doc);
      const elementChanges: EditorElementChangeEvent[] = [];
      editor.eventsEmitter.subscribe({
        onElementChange: (event) => elementChanges.push(event)
      });
      editor.start();
      editor.nav.FOCUS(doc.root);
      const rootParent = doc.root.parentElement;

      // act
      const inserted = editor.focus.insertNewAfter('p');

      // assert
      expect(inserted).toBe(false);
      expect(Array.from(doc.root.children)).toHaveLength(2);
      expect(rootParent ? Array.from(rootParent.children) : []).toEqual([doc.root]);
      expect(editor.nav.getFocus()).toBe(doc.root);
      expect(elementChanges).toEqual([]);

      editor.destroy();
    });
  });

  describe('insertNewBefore', () => {
    test('view mode', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
      const editor = createNullEditor(doc);
      const elementChanges: EditorElementChangeEvent[] = [];
      editor.eventsEmitter.subscribe({
        onElementChange: (event) => elementChanges.push(event)
      });
      editor.start();
      editor.nav.REQUEST_FOCUS(byId(doc, 'p2'));

      // act
      const inserted = editor.focus.insertNewBefore('p');

      // assert
      const children = Array.from(doc.root.children);
      expect(inserted).toBe(true);
      expect(children).toHaveLength(3);
      expect(children[1]?.tagName.toLowerCase()).toBe('p');
      expect(children[1]?.querySelector(`.${JSED_TOKEN_CLASS}`)).not.toBeNull();
      expect(editor.nav.getFocus()).toBe(children[1]);
      expect(elementChanges).toEqual([
        {
          type: 'focusable-inserted',
          element: children[1]
        }
      ]);

      editor.destroy();
    });

    test('edit mode no-op', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
      const editor = createNullEditor(doc);
      const elementChanges: EditorElementChangeEvent[] = [];
      editor.eventsEmitter.subscribe({
        onElementChange: (event) => elementChanges.push(event)
      });
      editor.start();
      editor.enterEditing(byId(doc, 'p1'));

      // act
      const inserted = editor.focus.insertNewBefore('p');

      // assert
      expect(inserted).toBe(false);
      expect(Array.from(doc.root.children)).toHaveLength(2);
      expect(editor.nav.getFocus()).toBe(byId(doc, 'p1'));
      expect(elementChanges).toEqual([]);

      editor.destroy();
    });

    test('document root no-op', () => {
      // arrange
      const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
      const editor = createNullEditor(doc);
      const elementChanges: EditorElementChangeEvent[] = [];
      editor.eventsEmitter.subscribe({
        onElementChange: (event) => elementChanges.push(event)
      });
      editor.start();
      editor.nav.FOCUS(doc.root);
      const rootParent = doc.root.parentElement;

      // act
      const inserted = editor.focus.insertNewBefore('p');

      // assert
      expect(inserted).toBe(false);
      expect(Array.from(doc.root.children)).toHaveLength(2);
      expect(rootParent ? Array.from(rootParent.children) : []).toEqual([doc.root]);
      expect(editor.nav.getFocus()).toBe(doc.root);
      expect(elementChanges).toEqual([]);

      editor.destroy();
    });
  });
});

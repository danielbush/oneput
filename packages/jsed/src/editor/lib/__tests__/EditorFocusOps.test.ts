import { describe, expect, it } from 'vitest';
import { byId, frag, identifyChildren, makeRoot, p } from '../../../test/util.js';
import { Editor } from '../../Editor.js';
import type { JsedDocument } from '../../../JsedDocument.js';
import { Controller } from '@oneput/oneput';

/**
 * `EditorFocusOps` is the orchestration layer over the FOCUS records. The
 * records' own behaviour (forward mutation, FOCUS placement, required-child
 * focus, no-op modes, undo/redo) is covered at the record level in
 * `../ops/__tests__/*.test.ts`. Here we only exercise what the facade adds:
 * recording each record on the shared `UndoRecorder` (so `editor.undo()` works)
 * and its `can*` guards.
 */
function createNullEditor(doc: JsedDocument): Editor {
  return Editor.createNull({
    document: doc,
    userInput: Controller.createNull().input
  });
}

describe('insertNewAfter (orchestration)', () => {
  it('records on the UndoRecorder so undo works through the facade', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const editor = createNullEditor(doc);
    editor.start();

    // act
    const inserted = editor.focusOps.insertNewAfter({ tagName: 'p' });

    // assert
    expect(inserted).toBe(true);
    expect(editor.canUndo()).toBe(true);
    editor.undo();
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[deleted-element]',
      '[element:p#p2]'
    ]);

    editor.destroy();
  });

  it('records nothing on a no-op', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const editor = createNullEditor(doc);
    editor.start();
    editor.enterEditing(byId(doc, 'p1'));

    // act
    const inserted = editor.focusOps.insertNewAfter({ tagName: 'p' });

    // assert
    expect(inserted).toBe(false);
    expect(editor.canUndo()).toBe(false);

    editor.destroy();
  });
});

describe('insertNewBefore (orchestration)', () => {
  it('records on the UndoRecorder so undo works through the facade', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const editor = createNullEditor(doc);
    editor.start();
    editor.nav.REQUEST_FOCUS(byId(doc, 'p2'));

    // act
    const inserted = editor.focusOps.insertNewBefore({ tagName: 'p' });

    // assert
    expect(inserted).toBe(true);
    expect(editor.canUndo()).toBe(true);
    editor.undo();
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p1]',
      '[deleted-element]',
      '[element:p#p2]'
    ]);

    editor.destroy();
  });

  it('records nothing on a no-op', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const editor = createNullEditor(doc);
    editor.start();
    editor.enterEditing(byId(doc, 'p1'));

    // act
    const inserted = editor.focusOps.insertNewBefore({ tagName: 'p' });

    // assert
    expect(inserted).toBe(false);
    expect(editor.canUndo()).toBe(false);

    editor.destroy();
  });
});

describe('appendNew (orchestration)', () => {
  it('records on the UndoRecorder so undo works through the facade', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo'));
    const editor = createNullEditor(doc);
    editor.start();

    // act
    const inserted = editor.focusOps.appendNew({ tagName: 'span' });
    const appended = byId(doc, 'p1').lastElementChild;

    // assert
    expect(inserted).toBe(true);
    expect(editor.canUndo()).toBe(true);
    editor.undo();
    expect(doc.root.contains(appended!)).toBe(false);

    editor.destroy();
  });

  it('canAppend is false and appendNew is a no-op for a tag without child elements', () => {
    // arrange
    const doc = makeRoot('<br id="break">');
    const editor = createNullEditor(doc);
    editor.start();
    editor.nav.FOCUS(byId(doc, 'break'));

    // act + assert
    expect(editor.focusOps.canAppend()).toBe(false);
    expect(editor.focusOps.appendNew({ tagName: 'span' })).toBe(false);
    expect(editor.canUndo()).toBe(false);

    editor.destroy();
  });
});

describe('delete (orchestration)', () => {
  it('records on the UndoRecorder so undo works through the facade', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const editor = createNullEditor(doc);
    editor.start();
    const p1 = byId(doc, 'p1');

    // act
    const deleted = editor.focusOps.delete();

    // assert
    expect(deleted).toBe(true);
    expect(editor.canUndo()).toBe(true);
    editor.undo();
    expect(doc.root.contains(p1)).toBe(true);

    editor.destroy();
  });

  it('canDelete is false and delete is a no-op for the document root', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const editor = createNullEditor(doc);
    editor.start();
    editor.nav.FOCUS(doc.root);

    // act + assert
    expect(editor.focusOps.canDelete()).toBe(false);
    expect(editor.focusOps.delete()).toBe(false);
    expect(editor.canUndo()).toBe(false);

    editor.destroy();
  });
});

import { describe, expect, it } from 'vitest';
import { Controller } from '@oneput/oneput';
import { byId, frag, makeRoot, p } from '../../../../test/util.js';
import { EditorState, type EditorElementChangeEvent } from '../../EditorState.js';
import type { JsedDocument } from '../../../../JsedDocument.js';
import { InsertElementAfter } from '../InsertElementAfter.js';

/**
 * Record-level tests for inserting an existing element after FOCUS.
 */
function getEditorState(doc: JsedDocument): EditorState {
  const state = EditorState.createNull({
    document: doc,
    userInput: Controller.createNull().input
  });
  state.start();
  return state;
}

describe('InsertElementAfter.run', () => {
  it('inserts the given element after the focused tag and focuses into it', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    expect(state.nav.getFocus()).toBe(byId(doc, 'p1'));

    const list = doc.root.ownerDocument.createElement('ul');
    const item = doc.root.ownerDocument.createElement('li');
    list.append(item);

    // act
    const record = InsertElementAfter.run(state, list);

    // assert
    const children = Array.from(doc.root.children);
    expect(record).toBeDefined();
    expect(children).toHaveLength(3);
    expect(children[1]).toBe(list);
    expect(state.nav.getFocus()).toBe(item);

    state.destroy();
  });

  it('emits a focusable-inserted element change for the inserted element', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    const elementChanges: EditorElementChangeEvent[] = [];
    state.eventsEmitter.subscribe({
      onElementChange: (event) => elementChanges.push(event)
    });

    const inserted = doc.root.ownerDocument.createElement('p');

    // act
    InsertElementAfter.run(state, inserted);

    // assert
    expect(elementChanges).toEqual([{ type: 'focusable-inserted', element: inserted }]);

    state.destroy();
  });

  it('does nothing when focus is the document root', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo'));
    const state = getEditorState(doc);
    state.nav.FOCUS(doc.root);
    const inserted = doc.root.ownerDocument.createElement('p');

    // act
    const record = InsertElementAfter.run(state, inserted);

    // assert
    expect(record).toBeUndefined();
    expect(doc.root.contains(inserted)).toBe(false);

    state.destroy();
  });

  it('inserts after an explicit anchor that is not the current FOCUS', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    state.nav.FOCUS(byId(doc, 'p2'));
    const inserted = doc.root.ownerDocument.createElement('p');
    inserted.id = 'p-new';

    // act
    const record = InsertElementAfter.run(state, inserted, byId(doc, 'p1'));

    // assert
    expect(record).toBeDefined();
    expect(Array.from(doc.root.children).map((el) => el.id)).toEqual(['p1', 'p-new', 'p2']);
    expect(state.nav.getFocus()).toBe(inserted);

    state.destroy();
  });
});

describe('InsertElementAfter undo / redo', () => {
  it('removes and restores the inserted element', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const state = getEditorState(doc);
    const inserted = doc.root.ownerDocument.createElement('p');
    const record = InsertElementAfter.run(state, inserted)!;

    // act
    record.undo(state);

    // assert
    expect(doc.root.contains(inserted)).toBe(false);
    expect(state.nav.getFocus()).toBe(byId(doc, 'p1'));

    // act
    record.redo(state);

    // assert
    expect(doc.root.children[1]).toBe(inserted);
    expect(state.nav.getFocus()).toBe(inserted);

    state.destroy();
  });
});

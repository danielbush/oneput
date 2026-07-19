import { describe, expect, it } from 'vitest';
import { Controller } from '@oneput/oneput';
import { byId, frag, makeRoot, p } from '../../../../test/util.js';
import { EditorState } from '../../EditorState.js';
import type { JsedDocument } from '../../../../JsedDocument.js';
import { MoveElement } from '../MoveElement.js';

/**
 * Record-level tests for moving an existing element.
 */
function getEditorState(doc: JsedDocument): EditorState {
  const state = EditorState.createNull({
    document: doc,
    userInput: Controller.createNull().input
  });
  state.start();
  return state;
}

describe('MoveElement.run', () => {
  it('moves an element after another sibling and focuses into it', () => {
    const doc = makeRoot(frag(p({ id: 'p1' }, 'a'), p({ id: 'p2' }, 'b'), p({ id: 'p3' }, 'c')));
    const state = getEditorState(doc);
    state.nav.FOCUS(byId(doc, 'p1'));

    const record = MoveElement.run(state, byId(doc, 'p1'), {
      type: 'after',
      ref: byId(doc, 'p2')
    });

    expect(record).toBeDefined();
    expect(Array.from(doc.root.children).map((el) => el.id)).toEqual(['p2', 'p1', 'p3']);
    expect(state.nav.getFocus()).toBe(byId(doc, 'p1'));

    state.destroy();
  });

  it('moves an element before a sibling', () => {
    const doc = makeRoot(frag(p({ id: 'p1' }, 'a'), p({ id: 'p2' }, 'b')));
    const state = getEditorState(doc);

    MoveElement.run(state, byId(doc, 'p2'), { type: 'before', ref: byId(doc, 'p1') });

    expect(Array.from(doc.root.children).map((el) => el.id)).toEqual(['p2', 'p1']);

    state.destroy();
  });

  it('appends an element into a parent', () => {
    const doc = makeRoot(frag(p({ id: 'p1' }, 'a'), p({ id: 'host' }, '')));
    const state = getEditorState(doc);
    const host = byId(doc, 'host');

    MoveElement.run(state, byId(doc, 'p1'), { type: 'append', parent: host });

    expect(host.contains(byId(doc, 'p1'))).toBe(true);
    expect(doc.root.children).toHaveLength(1);

    state.destroy();
  });

  it('returns undefined for a no-op move after the previous sibling', () => {
    const doc = makeRoot(frag(p({ id: 'p1' }, 'a'), p({ id: 'p2' }, 'b')));
    const state = getEditorState(doc);

    const record = MoveElement.run(state, byId(doc, 'p2'), {
      type: 'after',
      ref: byId(doc, 'p1')
    });

    expect(record).toBeUndefined();

    state.destroy();
  });
});

describe('MoveElement undo / redo', () => {
  it('restores the prior sibling order', () => {
    const doc = makeRoot(frag(p({ id: 'p1' }, 'a'), p({ id: 'p2' }, 'b'), p({ id: 'p3' }, 'c')));
    const state = getEditorState(doc);
    state.nav.FOCUS(byId(doc, 'p3'));
    const record = MoveElement.run(state, byId(doc, 'p3'), {
      type: 'before',
      ref: byId(doc, 'p1')
    })!;

    record.undo(state);
    expect(Array.from(doc.root.children).map((el) => el.id)).toEqual(['p1', 'p2', 'p3']);

    record.redo(state);
    expect(Array.from(doc.root.children).map((el) => el.id)).toEqual(['p3', 'p1', 'p2']);

    state.destroy();
  });
});

import { describe, expect, it } from 'vitest';
import { Controller } from '@oneput/oneput';
import { byId, frag, identifyChildren, makeRoot, p } from '../../../../test/util.js';
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
    expect(identifyChildren(doc.root)).toEqual([
      '[deleted-element]',
      '[element:p#p2]',
      '[element:p#p1]',
      '[element:p#p3]'
    ]);
    expect(state.nav.getFocus()).toBe(byId(doc, 'p1'));

    state.destroy();
  });

  it('moves an element before a sibling', () => {
    const doc = makeRoot(frag(p({ id: 'p1' }, 'a'), p({ id: 'p2' }, 'b')));
    const state = getEditorState(doc);

    MoveElement.run(state, byId(doc, 'p2'), { type: 'before', ref: byId(doc, 'p1') });

    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p2]',
      '[element:p#p1]',
      '[deleted-element]'
    ]);

    state.destroy();
  });

  it('appends an element into a parent', () => {
    const doc = makeRoot(frag(p({ id: 'p1' }, 'a'), p({ id: 'host' }, '')));
    const state = getEditorState(doc);
    const host = byId(doc, 'host');

    MoveElement.run(state, byId(doc, 'p1'), { type: 'append', parent: host });

    expect(host.contains(byId(doc, 'p1'))).toBe(true);
    expect(identifyChildren(doc.root)).toEqual(['[deleted-element]', '[element:p#host]']);

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
    expect(identifyChildren(doc.root)).toEqual([
      '[deleted-element]',
      '[element:p#p1]',
      '[element:p#p2]',
      '[element:p#p3]'
    ]);

    record.redo(state);
    expect(identifyChildren(doc.root)).toEqual([
      '[element:p#p3]',
      '[element:p#p1]',
      '[element:p#p2]',
      '[deleted-element]'
    ]);

    state.destroy();
  });
});

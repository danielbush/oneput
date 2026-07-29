import { Controller } from '@oneput/oneput';
import { describe, expect, test } from 'vitest';
import { byId, frag, makeRoot, p } from '../../../../test/util.js';
import { EditorState, type EditorElementChangeEvent } from '../../EditorState.js';
import { PatchElement } from '../PatchElement.js';

describe('PatchElement.run', () => {
  test('patches / emits / preserves FOCUS', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    const focus = state.nav.getFocus();
    const target = byId(doc, 'p2');
    const elementChanges: EditorElementChangeEvent[] = [];
    let documentChanges = 0;
    state.eventsEmitter.subscribe({
      onElementChange: (event) => elementChanges.push(event),
      onDocumentChange: () => {
        documentChanges += 1;
      }
    });

    // act
    const record = PatchElement.run(state, target, {
      attributes: { 'aria-label': 'Complete' },
      classes: { add: ['complete'] }
    });

    // assert
    expect(record).toBeDefined();
    expect(target.getAttribute('aria-label')).toBe('Complete');
    expect(target.classList.contains('complete')).toBe(true);
    expect(state.nav.getFocus()).toBe(focus);
    expect(elementChanges).toEqual([{ type: 'focusable-patched', element: target }]);
    expect(documentChanges).toBe(1);

    // act
    record?.undo(state);
    record?.redo(state);

    // assert
    expect(elementChanges).toEqual([{ type: 'focusable-patched', element: target }]);
    expect(documentChanges).toBe(1);

    state.destroy();
  });

  test('html containing FOCUS: move / apply', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    const target = doc.root;
    const previousFocus = byId(doc, 'p1');
    state.nav.FOCUS(previousFocus);

    // act
    const record = PatchElement.run(state, target, {
      html: '<section id="changed">changed</section>'
    });

    // assert
    expect(record).toBeDefined();
    expect(state.nav.getFocus()).toBe(doc.root);
    expect(previousFocus.isConnected).toBe(false);
    expect(byId(doc, 'changed').textContent).toBe('changed');
    expect(doc.root.querySelectorAll('.jsed-focus')).toHaveLength(0);

    state.destroy();
  });

  test('html containing CURSOR: exit / detokenize / apply', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, 'two')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    const target = byId(doc, 'p1');
    state.enterEditing(target);

    // act
    const record = PatchElement.run(state, target, { html: '<strong>changed</strong>' });

    // assert
    expect(record).toBeDefined();
    expect(state.isEditing()).toBe(false);
    expect(target.querySelector('strong')?.textContent).toBe('changed');
    expect(target.querySelector('.jsed-token')).toBeNull();

    state.destroy();
  });

  test('safe html: undo / redo / preserves FOCUS', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'one'), p({ id: 'p2' }, '<span>before</span>')));
    const state = EditorState.createNull({
      document: doc,
      userInput: Controller.createNull().input
    });
    state.start();
    const focus = state.nav.getFocus();
    const target = byId(doc, 'p2');

    // act
    const record = PatchElement.run(state, target, { html: '<strong>after</strong>' });

    // assert
    expect(record).toBeDefined();
    expect(target.querySelector('strong')?.textContent).toBe('after');
    expect(state.nav.getFocus()).toBe(focus);

    // act
    record?.undo(state);

    // assert
    expect(target.querySelector('span')?.textContent).toBe('before');
    expect(state.nav.getFocus()).toBe(focus);

    // act
    record?.redo(state);

    // assert
    expect(target.querySelector('strong')?.textContent).toBe('after');
    expect(state.nav.getFocus()).toBe(focus);

    state.destroy();
  });
});

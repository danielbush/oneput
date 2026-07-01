import { describe, expect, it } from 'vitest';
import { byId, frag, li, makeRoot, p, ul } from '../../test/util.js';
import { Editor } from '../Editor.js';
import type { JsedDocument } from '../../JsedDocument.js';
import { Controller } from '@oneput/oneput';
import { isDeletedElement, JSED_ANCHOR_CLASS } from '../../lib/core/taxonomy.js';

function createNullEditor(doc: JsedDocument): Editor {
  return Editor.createNull({
    document: doc,
    userInput: Controller.createNull().input
  });
}

describe('insertElementAfterFocus', () => {
  it('inserts a new element after the focused tag and focuses it', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const editor = createNullEditor(doc);
    editor.start();

    // act
    expect(editor.nav.getFocus()).toBe(byId(doc, 'p1'));
    const inserted = editor.focus.insertNewAfter('p');

    // assert
    const children = Array.from(doc.root.children);
    expect(inserted).toBe(true);
    expect(children).toHaveLength(3);
    expect(children[1]?.tagName.toLowerCase()).toBe('p');
    expect(children[1]?.querySelector(`.${JSED_ANCHOR_CLASS}`)).not.toBeNull();
    expect(editor.nav.getFocus()).toBe(children[1]);

    editor.destroy();
  });

  it('uses a typed element name when the focused tag parent allows it', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const editor = createNullEditor(doc);
    editor.start();

    // act
    const inserted = editor.focus.insertNewAfter('h2');

    // assert
    const children = Array.from(doc.root.children);
    expect(inserted).toBe(true);
    expect(children[1]?.tagName.toLowerCase()).toBe('h2');
    expect(editor.nav.getFocus()).toBe(children[1]);

    editor.destroy();
  });
});

describe('insertElementBeforeFocus', () => {
  it('uses a typed element name before the focused tag and focuses it', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const editor = createNullEditor(doc);
    editor.start();
    editor.nav.REQUEST_FOCUS(byId(doc, 'p2'));

    // act
    const inserted = editor.focus.insertNewBefore('h2');

    // assert
    const children = Array.from(doc.root.children);
    expect(inserted).toBe(true);
    expect(children).toHaveLength(3);
    expect(children[1]?.tagName.toLowerCase()).toBe('h2');
    expect(editor.nav.getFocus()).toBe(children[1]);

    editor.destroy();
  });
});

describe('insertElementInFocus', () => {
  it('uses a typed element name inside the focused tag and focuses it', () => {
    // arrange
    const doc = makeRoot(p({ id: 'p1' }, 'foo'));
    const editor = createNullEditor(doc);
    editor.start();
    const p1 = byId(doc, 'p1');

    // act
    const inserted = editor.focus.appendNew('span');

    // assert
    const child = p1.lastElementChild;
    expect(inserted).toBe(true);
    expect(child?.tagName.toLowerCase()).toBe('span');
    expect(child?.querySelector(`.${JSED_ANCHOR_CLASS}`)).not.toBeNull();
    expect(editor.nav.getFocus()).toBe(child);

    editor.destroy();
  });

  it('defaults to a specific child tag when the focused tag requires one', () => {
    // arrange
    const doc = makeRoot(ul({ id: 'list' }, li('one')));
    const editor = createNullEditor(doc);
    editor.start();
    const list = byId(doc, 'list');
    editor.nav.REQUEST_FOCUS(list);

    // act
    const inserted = editor.focus.appendNew('li');

    // assert
    const child = list.lastElementChild;
    expect(inserted).toBe(true);
    expect(child?.tagName.toLowerCase()).toBe('li');
    expect(editor.nav.getFocus()).toBe(child);

    editor.destroy();
  });

  it('does not offer insert-in for a tag without child elements', () => {
    // arrange
    const doc = makeRoot('<br id="break">');
    const editor = createNullEditor(doc);
    editor.start();

    // act
    editor.nav.FOCUS(byId(doc, 'break'));

    // assert
    expect(editor.focus.canAppend()).toBe(false);
    expect(editor.focus.appendNew('span')).toBe(false);

    editor.destroy();
  });
});

describe('deleteFocus', () => {
  it('deletes the focused element and focuses the next FOCUSABLE', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const editor = createNullEditor(doc);
    editor.start();
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');

    // act
    const deleted = editor.focus.delete();

    // assert
    expect(deleted).toBe(true);
    expect(doc.root.contains(p1)).toBe(false);
    expect(doc.root.children).toHaveLength(2);
    expect(isDeletedElement(doc.root.children[0])).toBe(true);
    expect(doc.root.children[1]).toBe(p2);
    expect(editor.nav.getFocus()).toBe(p2);

    editor.destroy();
  });

  it('deletes the focused element and falls back to the previous FOCUSABLE', () => {
    // arrange
    const doc = makeRoot(frag(p({ id: 'p1' }, 'foo'), p({ id: 'p2' }, 'bar')));
    const editor = createNullEditor(doc);
    editor.start();
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');
    editor.nav.REQUEST_FOCUS(p2);

    // act
    const deleted = editor.focus.delete();

    // assert
    expect(deleted).toBe(true);
    expect(doc.root.contains(p2)).toBe(false);
    expect(doc.root.children).toHaveLength(2);
    expect(doc.root.children[0]).toBe(p1);
    expect(isDeletedElement(doc.root.children[1])).toBe(true);
    expect(editor.nav.getFocus()).toBe(p1);

    editor.destroy();
  });
});

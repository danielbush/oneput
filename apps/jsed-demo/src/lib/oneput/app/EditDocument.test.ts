import { Controller } from '@oneput/oneput';
import { EditManager, JsedDocument } from '@oneput/jsed';
import { describe, expect, test, it } from 'vitest';
import { EditDocument } from './EditDocument.js';

function makeDocument(html: string): JsedDocument {
  document.body.innerHTML = `<div id="root">${html}</div>`;
  return JsedDocument.createNull(document.getElementById('root') as HTMLElement);
}

function byId(doc: JsedDocument, id: string): HTMLElement {
  const el = doc.document.getElementById(id);
  if (!el) {
    throw new Error(`Missing element with id="${id}"`);
  }
  return el as HTMLElement;
}

describe('EditDocument', () => {
  it('starts in view mode and quick-descends first focus without going into edit mode', () => {
    // arrange
    const doc = makeDocument('<p id="p1">foo bar</p><p id="p2">baz qux</p>');
    const ctl = Controller.createNull();
    const editManager = EditManager.createNull({
      document: doc,
      userInput: ctl.input,
      onError: (err) => editDocument.handleEditError(err)
    });
    const editDocument = new EditDocument(ctl, doc, editManager);
    const p1 = byId(doc, 'p1');

    ctl.simulateStart(() => editDocument);
    const appChanges = ctl.trackAppChanges();

    // act
    editManager.nav.REQUEST_FOCUS(p1);

    // assert
    expect(editManager.getMode()).toBe('view');
    expect(editManager.nav.getFocus()).toBe(p1);
    expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
    expect(appChanges.data).toEqual([]);
  });

  it('uses the same app object to move from view mode into edit mode', () => {
    // arrange
    const doc = makeDocument('<p id="p1">foo bar</p>');
    const ctl = Controller.createNull();
    const editManager = EditManager.createNull({
      document: doc,
      userInput: ctl.input,
      onError: (err) => editDocument.handleEditError(err)
    });
    const editDocument = new EditDocument(ctl, doc, editManager);
    const p1 = byId(doc, 'p1');
    ctl.simulateStart(() => editDocument);
    const appChanges = ctl.trackAppChanges();

    // act
    editManager.nav.REQUEST_FOCUS(p1);
    editManager.nav.REQUEST_FOCUS(p1);

    // assert
    expect(editManager.getMode()).toBe('edit');
    expect(editManager.cursor?.getToken().textContent?.trim()).toBe('foo');
    expect(appChanges.data).toEqual([]);
  });

  it('splits the current paragraph when ENTER is pressed in edit mode', async () => {
    // arrange
    const doc = makeDocument('<p id="p1">foo bar</p>');
    const ctl = Controller.createNull();
    const editManager = EditManager.createNull({
      document: doc,
      userInput: ctl.input,
      onError: (err) => editDocument.handleEditError(err)
    });
    const editDocument = new EditDocument(ctl, doc, editManager);
    const p1 = byId(doc, 'p1');

    ctl.simulateStart(() => editDocument);
    // Edit mode
    editManager.nav.REQUEST_FOCUS(p1);
    editManager.nav.REQUEST_FOCUS(p1);
    editManager.cursor?.moveNext();

    // act
    await ctl.simulateKey('Enter');

    // assert
    const paragraphs = Array.from(doc.root.querySelectorAll('p'));
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]?.textContent?.trim()).toBe('foo');
    expect(paragraphs[1]?.textContent?.trim()).toBe('bar');
    expect(editManager.cursor?.getToken().textContent?.trim()).toBe('bar');
  });
});

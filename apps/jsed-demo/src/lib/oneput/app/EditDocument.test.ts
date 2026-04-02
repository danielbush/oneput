import { Controller } from '@oneput/oneput';
import { EditManager, JsedDocument } from '@oneput/jsed';
import { describe, expect, it } from 'vitest';
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
  it('starts in view mode and quick-descends first focus without launching another app', () => {
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

    ctl.app.run(editDocument);
    const appChanges = ctl.app.trackAppChanges();

    // act
    editManager.nav.REQUEST_FOCUS(p1);

    // assert
    expect(editManager.getMode()).toBe('view');
    expect(editManager.nav.getFocus()).toBe(p1);
    expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
    expect(appChanges.data).toEqual([]);
  });

  it('uses the same app object to move from view mode into editing', () => {
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

    ctl.app.run(editDocument);
    const appChanges = ctl.app.trackAppChanges();
    editManager.nav.REQUEST_FOCUS(p1);

    // act
    editManager.nav.REQUEST_FOCUS(p1);

    // assert
    expect(editManager.getMode()).toBe('editing');
    expect(editManager.cursor?.getToken().textContent?.trim()).toBe('foo');
    expect(appChanges.data).toEqual([]);
  });
});

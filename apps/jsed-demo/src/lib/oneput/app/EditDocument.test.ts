import type { Controller } from '@oneput/oneput';
import { JsedDocument } from '@oneput/jsed';
import { describe, expect, it, vi } from 'vitest';
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

function makeController() {
  const ctl = {
    app: {
      run: vi.fn(),
      exit: vi.fn()
    },
    events: {
      on: vi.fn(() => () => {})
    },
    input: {
      setInputValue: vi.fn(async () => {}),
      selectAll: vi.fn(),
      moveCursorToBeginning: vi.fn(),
      moveCursorToEnd: vi.fn(),
      getRange: vi.fn(() => [0, 0] as [number | null, number | null]),
      focus: vi.fn(),
      enable: vi.fn(),
      setPlaceholder: vi.fn(),
      resetPlaceholder: vi.fn()
    },
    notify: vi.fn()
  } as unknown as Controller;

  return { ctl };
}

describe('EditDocument', () => {
  it('starts in view mode and quick-descends first focus without launching another app', () => {
    // arrange
    const doc = makeDocument('<p id="p1">foo bar</p><p id="p2">baz qux</p>');
    const { ctl } = makeController();
    const editDocument = EditDocument.create(ctl, { document: doc });
    const editManager = (editDocument as any).editManager;
    const p1 = byId(doc, 'p1');

    editDocument.onStart();

    // act
    editManager.nav.REQUEST_FOCUS(p1);

    // assert
    expect(editManager.getMode()).toBe('view');
    expect(editManager.nav.getFocus()).toBe(p1);
    expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
    expect((ctl as any).app.run).not.toHaveBeenCalled();
  });

  it('uses the same app object to move from view mode into editing', () => {
    // arrange
    const doc = makeDocument('<p id="p1">foo bar</p>');
    const { ctl } = makeController();
    const editDocument = EditDocument.create(ctl, { document: doc });
    const editManager = (editDocument as any).editManager;
    const p1 = byId(doc, 'p1');

    editDocument.onStart();
    editManager.nav.REQUEST_FOCUS(p1);

    // act
    editManager.nav.REQUEST_FOCUS(p1);

    // assert
    expect(editManager.getMode()).toBe('editing');
    expect(editManager.cursor?.getToken().textContent?.trim()).toBe('foo');
    expect((ctl as any).app.run).not.toHaveBeenCalled();
  });
});

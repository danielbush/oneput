import type { Controller } from '@oneput/oneput';
import { JsedDocument } from '@oneput/jsed';
import { describe, expect, it, vi } from 'vitest';
import { ViewDocument } from './ViewDocument.js';

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
  const run = vi.fn();
  const ctl = {
    app: {
      run,
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
      getRange: vi.fn(() => [0, 0]),
      focus: vi.fn(),
      enable: vi.fn(),
      setPlaceholder: vi.fn(),
      resetPlaceholder: vi.fn()
    },
    notify: vi.fn()
  } as unknown as Controller;

  return { ctl, run };
}

describe('ViewDocument', () => {
  it('first focus tokenizes a new FOCUSABLE without entering edit mode', () => {
    // arrange
    const doc = makeDocument('<p id="p1">foo bar</p><p id="p2">baz qux</p>');
    const { ctl, run } = makeController();
    const view = new ViewDocument(ctl, doc);
    const nav = (view as any).nav;
    const p1 = byId(doc, 'p1');

    // act
    nav.REQUEST_FOCUS(p1);

    // assert
    expect(run).not.toHaveBeenCalled();
    expect(nav.getFocus()).toBe(p1);
    expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
  });

  it('onResume quick-descends the focusElement returned from edit mode', () => {
    // arrange
    const doc = makeDocument('<p id="p1">foo bar</p><p id="p2">baz qux</p>');
    const { ctl } = makeController();
    const view = new ViewDocument(ctl, doc);
    const nav = (view as any).nav;
    const p2 = byId(doc, 'p2');

    // act
    view.onResume({ payload: { focusElement: p2 } });

    // assert
    expect(nav.getFocus()).toBe(p2);
    expect(p2.querySelectorAll('.jsed-token')).toHaveLength(2);
  });

  it('clicking a TOKEN in a different already-tokenized FOCUSABLE focuses first and edits on second click', () => {
    // arrange
    const doc = makeDocument('<p id="p1">foo bar</p><p id="p2">baz qux</p>');
    const { ctl, run } = makeController();
    const view = new ViewDocument(ctl, doc);
    const nav = (view as any).nav;
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');

    nav.REQUEST_FOCUS(p1);
    nav.REQUEST_FOCUS(p2);
    run.mockClear();
    const p1FirstToken = p1.querySelector('.jsed-token') as HTMLElement;

    // act
    nav.REQUEST_FOCUS(p1FirstToken);

    // assert
    expect(run).not.toHaveBeenCalled();
    expect(nav.getFocus()).toBe(p1);

    // act
    nav.REQUEST_FOCUS(p1FirstToken);

    // assert
    expect(run).toHaveBeenCalledOnce();
  });
});

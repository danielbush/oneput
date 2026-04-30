import { Controller } from '@oneput/oneput';
import { EditManager, JsedDocument } from '@oneput/jsed';
import { describe, expect, test, it } from 'vitest';
import { EditDocument } from './EditDocument.js';

function makeDocument(
  html: string,
  opts?: Parameters<typeof JsedDocument.createNull>[1]
): JsedDocument {
  document.body.innerHTML = `<div id="root">${html}</div>`;
  return JsedDocument.createNull(document.getElementById('root') as HTMLElement, opts);
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

  it('binds cmd+m to reveal the active token', () => {
    // arrange
    const doc = makeDocument('<p id="p1">foo bar</p>', {
      viewportScrollerOpts: {
        getElementRect: (el) =>
          el.classList.contains('jsed-token-focus')
            ? {
                top: 0,
                left: 0,
                bottom: 20,
                right: 40,
                width: 40,
                height: 20
              }
            : undefined
      }
    });
    const ctl = Controller.createNull();
    const editManager = EditManager.createNull({
      document: doc,
      userInput: ctl.input,
      onError: (err) => editDocument.handleEditError(err)
    });
    const editDocument = new EditDocument(ctl, doc, editManager);
    const p1 = byId(doc, 'p1');

    ctl.simulateStart(() => editDocument);
    editManager.nav.REQUEST_FOCUS(p1);
    editManager.nav.REQUEST_FOCUS(p1);

    const token = editManager.cursor?.getToken() as HTMLElement;
    const scrollRequests = doc.viewportScroller.trackScrollRequests();
    scrollRequests.data.length = 0;

    // act
    editDocument.actions.REVEAL.action();

    // assert
    expect(editDocument.actions.REVEAL.binding.bindings).toContain('$mod+m');
    expect(scrollRequests.data).toEqual([
      {
        element: token,
        options: {
          block: 'center',
          inline: 'nearest',
          behavior: 'smooth'
        }
      }
    ]);
  });

  it('adds a Tag selection menu item that wraps the current cursor token on submit', () => {
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
    editManager.nav.REQUEST_FOCUS(p1);
    editManager.nav.REQUEST_FOCUS(p1);
    editDocument.renderMenuItems();
    const cursorToken = editManager.cursor?.getToken() as HTMLElement;
    const tagItem = ctl.currentProps.menuItems?.find((item) => item.id === 'TAG_SELECTION');

    // act
    tagItem?.action?.(ctl);
    ctl.input.setInputValue('em');
    ctl.input.runSubmitHandler();

    // assert
    const wrapper = p1.querySelector('em') as HTMLElement;
    expect(tagItem).toBeDefined();
    expect(wrapper).not.toBeNull();
    expect(wrapper.firstElementChild).toBe(cursorToken);
    expect(editManager.cursor?.getToken()).toBe(cursorToken);
  });
});

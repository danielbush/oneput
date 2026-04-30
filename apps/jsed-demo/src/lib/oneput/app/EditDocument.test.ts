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
    const p2 = byId(doc, 'p2');

    ctl.simulateStart(() => editDocument);
    const appChanges = ctl.trackAppChanges();

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
    editDocument.renderMenuItems();
    const cursorToken = editManager.cursor?.getToken() as HTMLElement;
    const tagItem = ctl.currentProps.menuItems?.find((item) => item.id === 'TAG_SELECTION');

    // act
    tagItem?.action?.(ctl);
    expect(ctl.currentProps.inputElement?.disabled).toBe(false);
    ctl.input.setInputValue('em');
    ctl.input.runSubmitHandler();

    // assert
    const wrapper = p1.querySelector('em') as HTMLElement;
    expect(tagItem).toBeDefined();
    expect(wrapper).not.toBeNull();
    expect(wrapper.firstElementChild).toBe(cursorToken);
    expect(editManager.cursor?.getToken()).toBe(cursorToken);
  });

  it('runs Tag selection as a child app so an island can use the input prompt', () => {
    // arrange
    const doc = makeDocument(
      '<div id="d1"><span class="katex" style="display:inline;">x²</span> after island</div>'
    );
    const ctl = Controller.createNull();
    const editManager = EditManager.createNull({
      document: doc,
      userInput: ctl.input,
      onError: (err) => editDocument.handleEditError(err)
    });
    const editDocument = new EditDocument(ctl, doc, editManager);
    const d1 = byId(doc, 'd1');

    ctl.simulateStart(() => editDocument);
    editManager.nav.REQUEST_FOCUS(d1);
    editDocument.renderMenuItems();
    const island = editManager.cursor?.getToken() as HTMLElement;
    const tagItem = ctl.currentProps.menuItems?.find((item) => item.id === 'TAG_SELECTION');
    expect(ctl.currentProps.inputElement?.disabled).toBe(true);

    // act
    tagItem?.action?.(ctl);
    expect(ctl.currentProps.inputElement?.disabled).toBe(false);
    ctl.input.setInputValue('em');
    ctl.input.runSubmitHandler();

    // assert
    const wrapper = d1.querySelector('em') as HTMLElement;
    expect(tagItem).toBeDefined();
    expect(wrapper).not.toBeNull();
    expect(wrapper.firstElementChild).toBe(island);
    expect(editManager.cursor?.getToken()).toBe(island);
    expect(ctl.currentProps.inputElement?.disabled).toBe(true);
  });

  it('adds an Insert element after tag menu item that defaults to the focused tag name', () => {
    // arrange
    const doc = makeDocument('<p id="p1">foo</p><p id="p2">bar</p>');
    const ctl = Controller.createNull();
    const editManager = EditManager.createNull({
      document: doc,
      userInput: ctl.input,
      onError: (err) => editDocument.handleEditError(err)
    });
    const editDocument = new EditDocument(ctl, doc, editManager);
    const p1 = byId(doc, 'p1');

    ctl.simulateStart(() => editDocument);
    editDocument.renderMenuItems();
    const insertItem = ctl.currentProps.menuItems?.find(
      (item) => item.id === 'INSERT_ELEMENT_AFTER_TAG'
    );

    // act
    insertItem?.action?.(ctl);
    expect(ctl.currentProps.inputValue).toBe('p');
    ctl.input.setInputValue('h2');
    ctl.input.runSubmitHandler();

    // assert
    const children = Array.from(doc.root.children);
    expect(insertItem).toBeDefined();
    expect(children).toHaveLength(3);
    expect(children[1]?.tagName.toLowerCase()).toBe('h2');
    expect(editManager.nav.getFocus()).toBe(children[1]);
  });

  it('adds an Insert element before tag menu item that defaults to the focused tag name', () => {
    // arrange
    const doc = makeDocument('<p id="p1">foo</p><p id="p2">bar</p>');
    const ctl = Controller.createNull();
    const editManager = EditManager.createNull({
      document: doc,
      userInput: ctl.input,
      onError: (err) => editDocument.handleEditError(err)
    });
    const editDocument = new EditDocument(ctl, doc, editManager);
    const p2 = byId(doc, 'p2');

    ctl.simulateStart(() => editDocument);
    editManager.nav.REQUEST_FOCUS(p2);
    editDocument.renderMenuItems();
    const insertItem = ctl.currentProps.menuItems?.find(
      (item) => item.id === 'INSERT_ELEMENT_BEFORE_TAG'
    );

    // act
    insertItem?.action?.(ctl);
    expect(ctl.currentProps.inputValue).toBe('p');
    ctl.input.setInputValue('h2');
    ctl.input.runSubmitHandler();

    // assert
    const children = Array.from(doc.root.children);
    expect(insertItem).toBeDefined();
    expect(children).toHaveLength(3);
    expect(children[1]?.tagName.toLowerCase()).toBe('h2');
    expect(editManager.nav.getFocus()).toBe(children[1]);
  });

  it('adds an Insert element in tag menu item that defaults to the focused tag name', () => {
    // arrange
    const doc = makeDocument('<div id="d1">foo</div>');
    const ctl = Controller.createNull();
    const editManager = EditManager.createNull({
      document: doc,
      userInput: ctl.input,
      onError: (err) => editDocument.handleEditError(err)
    });
    const editDocument = new EditDocument(ctl, doc, editManager);
    const d1 = byId(doc, 'd1');

    ctl.simulateStart(() => editDocument);
    editDocument.renderMenuItems();
    const insertItem = ctl.currentProps.menuItems?.find(
      (item) => item.id === 'INSERT_ELEMENT_IN_TAG'
    );

    // act
    insertItem?.action?.(ctl);
    expect(ctl.currentProps.inputValue).toBe('div');
    ctl.input.setInputValue('p');
    ctl.input.runSubmitHandler();

    // assert
    const child = d1.lastElementChild;
    expect(insertItem).toBeDefined();
    expect(child?.tagName.toLowerCase()).toBe('p');
    expect(editManager.nav.getFocus()).toBe(child);
  });

  it('defaults Insert element in tag to a specific child tag when required', () => {
    // arrange
    const doc = makeDocument('<ul id="list"><li>one</li></ul>');
    const ctl = Controller.createNull();
    const editManager = EditManager.createNull({
      document: doc,
      userInput: ctl.input,
      onError: (err) => editDocument.handleEditError(err)
    });
    const editDocument = new EditDocument(ctl, doc, editManager);
    const list = byId(doc, 'list');

    ctl.simulateStart(() => editDocument);
    editManager.nav.REQUEST_FOCUS(list);
    editDocument.renderMenuItems();
    const insertItem = ctl.currentProps.menuItems?.find(
      (item) => item.id === 'INSERT_ELEMENT_IN_TAG'
    );

    // act
    insertItem?.action?.(ctl);
    expect(ctl.currentProps.inputValue).toBe('li');
    ctl.input.runSubmitHandler();

    // assert
    const child = list.lastElementChild;
    expect(insertItem).toBeDefined();
    expect(child?.tagName.toLowerCase()).toBe('li');
    expect(editManager.nav.getFocus()).toBe(child);
  });

  it('adds a Delete focused element menu item that confirms before deleting', async () => {
    // arrange
    const doc = makeDocument('<p id="p1">foo</p><p id="p2">bar</p>');
    const ctl = Controller.createNull();
    const editManager = EditManager.createNull({
      document: doc,
      userInput: ctl.input,
      onError: (err) => editDocument.handleEditError(err)
    });
    const editDocument = new EditDocument(ctl, doc, editManager);
    const p1 = byId(doc, 'p1');
    const p2 = byId(doc, 'p2');

    ctl.simulateStart(() => editDocument);
    editDocument.renderMenuItems();
    const deleteItem = ctl.currentProps.menuItems?.find(
      (item) => item.id === 'DELETE_FOCUSED_ELEMENT'
    );

    // act
    const action = deleteItem?.action?.(ctl);
    ctl.currentProps.menuOpen = true;
    await ctl.simulateKey('Enter');
    await action;

    // assert
    expect(deleteItem).toBeDefined();
    expect(doc.root.contains(p1)).toBe(false);
    expect(Array.from(doc.root.children)).toHaveLength(1);
    expect(editManager.nav.getFocus()).toBe(p2);
  });
});

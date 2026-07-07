import { Controller } from '@oneput/oneput';
import { describe, expect, it } from 'vitest';
import { isDeletedElement } from '../../../lib/core/taxonomy.js';
import { makeRoot } from '../../../test/util.js';
import { JsedDocument } from '../../../JsedDocument.js';
import { JsedUI } from '../JsedUI.js';
import { JsedAction } from '../JsedAction.js';

function byId(doc: JsedDocument, id: string): HTMLElement {
  const el = doc.document.getElementById(id);
  if (!el) {
    throw new Error(`Missing element with id="${id}"`);
  }
  return el as HTMLElement;
}

/**
 * Open the menu the way a user would — `openMenu()` flips `menuOpen` on a timer
 * (MENU_OPEN_CLOSE_RACE) and pull-on-open builds the items from current state.
 * Await before reading `currentProps.menuItems`.
 */
async function openMenu(ctl: Controller) {
  ctl.menu.openMenu();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('JsedEditDocumentUI', () => {
  it('starts in view mode and quick-descends first focus without going into edit mode', () => {
    // arrange
    const document = makeRoot('<p id="p1">foo bar</p><p id="p2">baz qux</p>');
    const ctl = Controller.createNull();
    const editorUI = JsedUI.createNull(ctl, { document });
    const p1 = byId(document, 'p1');

    // act
    ctl.simulateStart(() => editorUI);
    const appChanges = ctl.trackAppChanges();
    const editor = editorUI.editor;

    // assert
    expect(editor.isEditing()).toBe(false);
    expect(editor.nav.getFocus()).toBe(p1);
    expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
    expect(appChanges.data).toEqual([]);
  });

  it('uses the same app object to move from view mode into edit mode', () => {
    // arrange
    const document = makeRoot('<p id="p1">foo bar</p>');
    const ctl = Controller.createNull();
    const editorUI = JsedUI.createNull(ctl, { document });
    const p1 = byId(document, 'p1');
    ctl.simulateStart(() => editorUI);
    const appChanges = ctl.trackAppChanges();
    const editor = editorUI.editor;

    // act
    editor.nav.REQUEST_FOCUS(p1);

    // assert
    expect(editor.isEditing()).toBe(true);
    expect(editor.getCursor()?.getPlace()?.textContent?.trim()).toBe('foo');
    expect(appChanges.data).toEqual([]);
  });

  it('splits the current paragraph when ENTER is pressed in edit mode', async () => {
    // arrange
    const document = makeRoot('<p id="p1">foo bar</p>');
    const ctl = Controller.createNull();
    const editorUI = JsedUI.createNull(ctl, { document });
    const p1 = byId(document, 'p1');
    const editor = editorUI.editor;
    ctl.simulateStart(() => editorUI);
    // Edit mode
    editor.nav.REQUEST_FOCUS(p1);
    editor.moveNext();

    // act
    await ctl.simulateKey('Enter');

    // assert
    const paragraphs = Array.from(document.root.querySelectorAll('p'));
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]?.textContent?.trim()).toBe('foo bar');
    expect(paragraphs[1]?.textContent?.trim()).toBe('');
    expect(editor.getCursor()?.getPlace()?.textContent?.trim()).toBe('');
  });

  it('binds cmd+m to reveal the active token', () => {
    // arrange
    const document = makeRoot('<p id="p1">foo bar</p>', {
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
    const editorUI = JsedUI.createNull(ctl, { document });
    const p1 = byId(document, 'p1');
    const editor = editorUI.editor;

    ctl.simulateStart(() => editorUI);
    editor.nav.REQUEST_FOCUS(p1);

    const token = editor.getCursor()?.getPlace() as HTMLElement;
    const scrollRequests = document.viewportScroller.trackScrollRequests();
    scrollRequests.data.length = 0;

    // act
    editorUI.actions()[JsedAction.REVEAL].action(ctl);

    // assert
    expect(editorUI.actions()[JsedAction.REVEAL].binding?.bindings).toContain('$mod+m');
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

  it('adds a Tag selection menu item that wraps the current cursor token on submit', async () => {
    // arrange
    const document = makeRoot('<p id="p1">foo bar</p>');
    const ctl = Controller.createNull();
    const editorUI = JsedUI.createNull(ctl, { document });
    const p1 = byId(document, 'p1');
    const editor = editorUI.editor;

    ctl.simulateStart(() => editorUI);
    editor.nav.REQUEST_FOCUS(p1);
    await openMenu(ctl);
    const cursorToken = editor.getCursor()?.getPlace() as HTMLElement;
    const tagItem = ctl.currentProps.menuItems?.find((item) => item.id === 'WRAP_SELECTION');

    // act
    tagItem?.action?.(ctl);
    const manualEntryItem = ctl.currentProps.menuItems?.find((item) => item.id === 'MANUAL_ENTRY');
    manualEntryItem?.action?.(ctl);
    expect(ctl.currentProps.inputElement?.disabled).toBe(false);
    ctl.input.setInputValue('em');
    ctl.input.runSubmitHandler();

    // assert
    const wrapper = p1.querySelector('em') as HTMLElement;
    expect(tagItem).toBeDefined();
    expect(manualEntryItem).toBeDefined();
    expect(wrapper).not.toBeNull();
    expect(wrapper.firstElementChild).toBe(cursorToken);
    expect(editor.getCursor()?.getPlace()).toBe(cursorToken);
  });

  it('runs Tag selection as a child app so an island can use the input prompt', async () => {
    // arrange
    const document = makeRoot(
      '<div id="d1"><span class="katex" style="display:inline;">x²</span> after island</div>'
    );
    const ctl = Controller.createNull();
    const editorUI = JsedUI.createNull(ctl, { document });
    const d1 = byId(document, 'd1');
    const editor = editorUI.editor;

    ctl.simulateStart(() => editorUI);
    editor.nav.REQUEST_FOCUS(d1);
    editor.moveNext();
    const island = editor.getCursor()?.getPlace() as HTMLElement;
    expect(ctl.currentProps.inputElement?.disabled).toBe(true);
    await openMenu(ctl);
    const tagItem = ctl.currentProps.menuItems?.find((item) => item.id === 'WRAP_SELECTION');

    // act
    tagItem?.action?.(ctl);
    const manualEntryItem = ctl.currentProps.menuItems?.find((item) => item.id === 'MANUAL_ENTRY');
    manualEntryItem?.action?.(ctl);
    expect(ctl.currentProps.inputElement?.disabled).toBe(false);
    ctl.input.setInputValue('em');
    ctl.input.runSubmitHandler();

    // assert
    const wrapper = d1.querySelector('em') as HTMLElement;
    expect(tagItem).toBeDefined();
    expect(manualEntryItem).toBeDefined();
    expect(wrapper).not.toBeNull();
    expect(wrapper.firstElementChild).toBe(island);
    expect(editor.getCursor()?.getPlace()).toBe(island);
    expect(ctl.currentProps.inputElement?.disabled).toBe(true);
  });

  it('adds an Insert element after tag menu item that defaults to the focused tag name', async () => {
    // arrange
    const document = makeRoot('<p id="p1">foo</p><p id="p2">bar</p>');
    const ctl = Controller.createNull();
    const editorUI = JsedUI.createNull(ctl, { document });
    const editor = editorUI.editor;

    ctl.simulateStart(() => editorUI);
    await openMenu(ctl);
    const insertItem = ctl.currentProps.menuItems?.find(
      (item) => item.id === 'INSERT_ELEMENT_AFTER_FOCUS'
    );

    // act
    insertItem?.action?.(ctl);
    const manualEntryItem = ctl.currentProps.menuItems?.find((item) => item.id === 'MANUAL_ENTRY');
    manualEntryItem?.action?.(ctl);
    ctl.input.setInputValue('h2');
    ctl.input.runSubmitHandler();

    // assert
    const children = Array.from(document.root.children);
    expect(insertItem).toBeDefined();
    expect(manualEntryItem).toBeDefined();
    expect(children).toHaveLength(3);
    expect(children[1]?.tagName.toLowerCase()).toBe('h2');
    expect(editor.nav.getFocus()).toBe(children[1]);
  });

  it('adds an Insert element before tag menu item that defaults to the focused tag name', async () => {
    // arrange
    const document = makeRoot('<p id="p1">foo</p><p id="p2">bar</p>');
    const ctl = Controller.createNull();
    const editorUI = JsedUI.createNull(ctl, { document });
    const editor = editorUI.editor;
    const p2 = byId(document, 'p2');

    ctl.simulateStart(() => editorUI);
    editor.nav.REQUEST_FOCUS(p2);
    await openMenu(ctl);
    const insertItem = ctl.currentProps.menuItems?.find(
      (item) => item.id === 'INSERT_ELEMENT_BEFORE_FOCUS'
    );

    // act
    insertItem?.action?.(ctl);
    const manualEntryItem = ctl.currentProps.menuItems?.find((item) => item.id === 'MANUAL_ENTRY');
    manualEntryItem?.action?.(ctl);
    ctl.input.setInputValue('h2');
    ctl.input.runSubmitHandler();

    // assert
    const children = Array.from(document.root.children);
    expect(insertItem).toBeDefined();
    expect(manualEntryItem).toBeDefined();
    expect(children).toHaveLength(3);
    expect(children[1]?.tagName.toLowerCase()).toBe('h2');
    expect(editor.nav.getFocus()).toBe(children[1]);
  });

  it('adds an Insert element in tag menu item that defaults to the focused tag name', async () => {
    // arrange
    const document = makeRoot('<div id="d1">foo</div>');
    const ctl = Controller.createNull();
    const editorUI = JsedUI.createNull(ctl, { document });
    const editor = editorUI.editor;
    const d1 = byId(document, 'd1');

    ctl.simulateStart(() => editorUI);
    await openMenu(ctl);
    const insertItem = ctl.currentProps.menuItems?.find(
      (item) => item.id === 'APPEND_NEW_ELEMENT_IN_FOCUS'
    );

    // act
    insertItem?.action?.(ctl);
    const manualEntryItem = ctl.currentProps.menuItems?.find((item) => item.id === 'MANUAL_ENTRY');
    manualEntryItem?.action?.(ctl);
    ctl.input.setInputValue('p');
    ctl.input.runSubmitHandler();

    // assert
    const child = d1.lastElementChild;
    expect(insertItem).toBeDefined();
    expect(manualEntryItem).toBeDefined();
    expect(child?.tagName.toLowerCase()).toBe('p');
    expect(editor.nav.getFocus()).toBe(child);
  });

  it('defaults Insert element in tag to a specific child tag when required', async () => {
    // arrange
    const document = makeRoot('<ul id="list"><li>one</li></ul>');
    const ctl = Controller.createNull();
    const editorUI = JsedUI.createNull(ctl, { document });
    const editor = editorUI.editor;
    const list = byId(document, 'list');

    ctl.simulateStart(() => editorUI);
    editor.nav.REQUEST_FOCUS(list);
    await openMenu(ctl);
    const insertItem = ctl.currentProps.menuItems?.find(
      (item) => item.id === 'APPEND_NEW_ELEMENT_IN_FOCUS'
    );

    // act
    insertItem?.action?.(ctl);
    const manualEntryItem = ctl.currentProps.menuItems?.find((item) => item.id === 'MANUAL_ENTRY');
    manualEntryItem?.action?.(ctl);
    ctl.input.setInputValue('li');
    ctl.input.runSubmitHandler();

    // assert
    const child = list.lastElementChild;
    expect(insertItem).toBeDefined();
    expect(manualEntryItem).toBeDefined();
    expect(child?.tagName.toLowerCase()).toBe('li');
    expect(editor.nav.getFocus()).toBe(child);
  });

  it('adds a Delete focused element menu item that confirms before deleting', async () => {
    // arrange
    const document = makeRoot('<p id="p1">foo</p><p id="p2">bar</p>');
    const ctl = Controller.createNull();
    const editorUI = JsedUI.createNull(ctl, { document });
    const editor = editorUI.editor;
    const p1 = byId(document, 'p1');
    const p2 = byId(document, 'p2');

    ctl.simulateStart(() => editorUI);
    await openMenu(ctl);
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
    expect(document.root.contains(p1)).toBe(false);
    expect(document.root.children).toHaveLength(2);
    expect(isDeletedElement(document.root.children[0])).toBe(true);
    expect(document.root.children[1]).toBe(p2);
    expect(editor.nav.getFocus()).toBe(p2);
  });
});

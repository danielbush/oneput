import { Editor, JsedDocument, type EditorError } from '@oneput/jsed';
import { describe, expect, it } from 'vitest';
import { Controller } from '../../../../../oneput/src/lib/oneput/controllers/controller.js';
import { OneputEditDocumentAdapter } from './OneputEditDocumentAdapter.js';
import type { AppObject } from '@oneput/oneput';

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

/**
 * Simple example of a consumer of OneputEditDocumentAdapter.
 */
export class EditDocument implements AppObject {
  static createNull(ctl: Controller, { document }: { document: JsedDocument }) {
    const instance = new EditDocument(ctl, {
      adapter: (instance: EditDocument) =>
        OneputEditDocumentAdapter.createNull(ctl, {
          document,
          onRenderMenuItems: instance.renderMenuItems,
          onEditError: instance.handleEditError
        })
    });
    return instance;
  }

  private adapter: OneputEditDocumentAdapter;
  public actions: AppObject['actions'];
  public editor: Editor;

  constructor(
    private ctl: Controller,
    private create: { adapter: (inst: EditDocument) => OneputEditDocumentAdapter }
  ) {
    this.adapter = this.create.adapter(this);
    this.actions = this.adapter.actions;
    this.editor = this.adapter.editor;
  }

  onStart = () => {
    this.adapter.start();
  };

  onResume = () => {
    this.adapter.resume();
  };

  onSuspend = () => {
    this.adapter.suspend();
  };

  onExit = () => {
    this.adapter.exit();
  };

  renderMenuItems = () => {
    this.ctl.menu.setMenu({
      id: 'EditDocument',
      focusBehaviour: 'last-action,first',
      items: this.adapter.getMenuItems({ renderMenuItems: this.renderMenuItems })
    });
  };

  handleEditError = (err: EditorError) => {
    this.ctl.notify(`There was an error editing the document: ${err.type}`);
  };
}

describe('EditDocument', () => {
  it('starts in view mode and quick-descends first focus without going into edit mode', () => {
    // arrange
    const document = makeDocument('<p id="p1">foo bar</p><p id="p2">baz qux</p>');
    const ctl = Controller.createNull();
    const editorUI = EditDocument.createNull(ctl, { document });
    const p1 = byId(document, 'p1');

    // act
    ctl.simulateStart(() => editorUI);
    const appChanges = ctl.trackAppChanges();
    const editor = editorUI.editor;

    // assert
    expect(editor.getMode()).toBe('view');
    expect(editor.nav.getFocus()).toBe(p1);
    expect(p1.querySelectorAll('.jsed-token')).toHaveLength(2);
    expect(appChanges.data).toEqual([]);
  });

  it('uses the same app object to move from view mode into edit mode', () => {
    // arrange
    const document = makeDocument('<p id="p1">foo bar</p>');
    const ctl = Controller.createNull();
    const editorUI = EditDocument.createNull(ctl, { document });
    const p1 = byId(document, 'p1');
    ctl.simulateStart(() => editorUI);
    const appChanges = ctl.trackAppChanges();
    const editor = editorUI.editor;

    // act
    editor.nav.REQUEST_FOCUS(p1);

    // assert
    expect(editor.getMode()).toBe('edit');
    expect(editor.cursor?.getPlace().textContent?.trim()).toBe('foo');
    expect(appChanges.data).toEqual([]);
  });

  it('splits the current paragraph when ENTER is pressed in edit mode', async () => {
    // arrange
    const document = makeDocument('<p id="p1">foo bar</p>');
    const ctl = Controller.createNull();
    const editorUI = EditDocument.createNull(ctl, { document });
    const p1 = byId(document, 'p1');
    const editor = editorUI.editor;
    ctl.simulateStart(() => editorUI);
    // Edit mode
    editor.nav.REQUEST_FOCUS(p1);
    editor.cursor?.moveNext();

    // act
    await ctl.simulateKey('Enter');

    // assert
    const paragraphs = Array.from(document.root.querySelectorAll('p'));
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]?.textContent?.trim()).toBe('foo bar');
    expect(paragraphs[1]?.textContent?.trim()).toBe('');
    expect(editor.cursor?.getPlace().textContent?.trim()).toBe('');
  });

  it('binds cmd+m to reveal the active token', () => {
    // arrange
    const document = makeDocument('<p id="p1">foo bar</p>', {
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
    const editorUI = EditDocument.createNull(ctl, { document });
    const p1 = byId(document, 'p1');
    const editor = editorUI.editor;

    ctl.simulateStart(() => editorUI);
    editor.nav.REQUEST_FOCUS(p1);

    const token = editor.cursor?.getPlace() as HTMLElement;
    const scrollRequests = document.viewportScroller.trackScrollRequests();
    scrollRequests.data.length = 0;

    // act
    editorUI.actions?.REVEAL.action(ctl);

    // assert
    expect(editorUI.actions?.REVEAL.binding?.bindings).toContain('$mod+m');
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
    const document = makeDocument('<p id="p1">foo bar</p>');
    const ctl = Controller.createNull();
    const editorUI = EditDocument.createNull(ctl, { document });
    const p1 = byId(document, 'p1');
    const editor = editorUI.editor;

    ctl.simulateStart(() => editorUI);
    editor.nav.REQUEST_FOCUS(p1);
    editorUI.renderMenuItems();
    const cursorToken = editor.cursor?.getPlace() as HTMLElement;
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
    expect(editor.cursor?.getPlace()).toBe(cursorToken);
  });

  it('runs Tag selection as a child app so an island can use the input prompt', () => {
    // arrange
    const document = makeDocument(
      '<div id="d1"><span class="katex" style="display:inline;">x²</span> after island</div>'
    );
    const ctl = Controller.createNull();
    const editorUI = EditDocument.createNull(ctl, { document });
    const d1 = byId(document, 'd1');
    const editor = editorUI.editor;

    ctl.simulateStart(() => editorUI);
    editor.nav.REQUEST_FOCUS(d1);
    editorUI.renderMenuItems();
    const island = editor.cursor?.getPlace() as HTMLElement;
    const tagItem = ctl.currentProps.menuItems?.find((item) => item.id === 'WRAP_SELECTION');
    expect(ctl.currentProps.inputElement?.disabled).toBe(true);

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
    expect(editor.cursor?.getPlace()).toBe(island);
    expect(ctl.currentProps.inputElement?.disabled).toBe(true);
  });

  it('adds an Insert element after tag menu item that defaults to the focused tag name', () => {
    // arrange
    const document = makeDocument('<p id="p1">foo</p><p id="p2">bar</p>');
    const ctl = Controller.createNull();
    const editorUI = EditDocument.createNull(ctl, { document });
    const editor = editorUI.editor;

    ctl.simulateStart(() => editorUI);
    editorUI.renderMenuItems();
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

  it('adds an Insert element before tag menu item that defaults to the focused tag name', () => {
    // arrange
    const document = makeDocument('<p id="p1">foo</p><p id="p2">bar</p>');
    const ctl = Controller.createNull();
    const editorUI = EditDocument.createNull(ctl, { document });
    const editor = editorUI.editor;
    const p2 = byId(document, 'p2');

    ctl.simulateStart(() => editorUI);
    editor.nav.REQUEST_FOCUS(p2);
    editorUI.renderMenuItems();
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

  it('adds an Insert element in tag menu item that defaults to the focused tag name', () => {
    // arrange
    const document = makeDocument('<div id="d1">foo</div>');
    const ctl = Controller.createNull();
    const editorUI = EditDocument.createNull(ctl, { document });
    const editor = editorUI.editor;
    const d1 = byId(document, 'd1');

    ctl.simulateStart(() => editorUI);
    editorUI.renderMenuItems();
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

  it('defaults Insert element in tag to a specific child tag when required', () => {
    // arrange
    const document = makeDocument('<ul id="list"><li>one</li></ul>');
    const ctl = Controller.createNull();
    const editorUI = EditDocument.createNull(ctl, { document });
    const editor = editorUI.editor;
    const list = byId(document, 'list');

    ctl.simulateStart(() => editorUI);
    editor.nav.REQUEST_FOCUS(list);
    editorUI.renderMenuItems();
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
    const document = makeDocument('<p id="p1">foo</p><p id="p2">bar</p>');
    const ctl = Controller.createNull();
    const editorUI = EditDocument.createNull(ctl, { document });
    const editor = editorUI.editor;
    const p1 = byId(document, 'p1');
    const p2 = byId(document, 'p2');

    ctl.simulateStart(() => editorUI);
    editorUI.renderMenuItems();
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
    expect(Array.from(document.root.children)).toHaveLength(1);
    expect(editor.nav.getFocus()).toBe(p2);
  });
});

import type { JsedDocument } from '$lib/jsed/index.js';
import type { AppObject, Controller } from '$oneput';
import { Editor } from '../Editor.js';

/**
 * Oneput AppObject that manages an edit session for a single document.
 */
export class EditDocument implements AppObject {
  static create(ctl: Controller, params: { document: JsedDocument; token: HTMLElement }) {
    const createEditor = () => {
      const editor = Editor.create({
        controller: ctl,
        document: params.document,
        initialToken: params.token
      });
      return editor;
    };
    return new EditDocument(ctl, createEditor);
  }

  private editor?: Editor;

  constructor(
    private ctl: Controller,
    private createEditor: () => Editor
  ) {}

  onStart() {
    this.editor = this.createEditor();
  }

  onExit = () => {
    //
  };
}

import type { AppObject, Controller } from '@oneput/oneput';
import type { Document } from '@oneput/jsed';

/**
 * Oneput AppObject that manages an edit session for a single document.
 */
export class EditDocument implements AppObject {
  static create(
    ctl: Controller,
    params: { document: Document; onStart: () => void; onExit: () => void }
  ) {
    return new EditDocument(ctl, params.document, params.onStart, params.onExit);
  }

  constructor(
    private ctl: Controller,
    private document: Document,
    public onStart: () => void,
    public onExit: () => void
  ) {}
}

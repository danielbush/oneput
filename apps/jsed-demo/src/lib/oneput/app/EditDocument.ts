import type { AppObject, Controller } from '@oneput/oneput';
import { type IJsedCursor } from '@oneput/jsed';

/**
 * Oneput AppObject that manages an edit session for a single document.
 */
export class EditDocument implements AppObject {
  static create(ctl: Controller, params: { cursor: IJsedCursor }) {
    return new EditDocument(ctl, params.cursor);
  }

  constructor(
    private ctl: Controller,
    private cursor: IJsedCursor
  ) {}

  public onStart = () => {};

  public onExit = () => {};
}

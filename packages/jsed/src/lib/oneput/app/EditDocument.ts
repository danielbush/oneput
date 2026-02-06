import type { AppObject, Controller } from '$oneput';

export class EditDocument implements AppObject {
  static create(ctl: Controller) {
    return new EditDocument(ctl);
  }

  constructor(private ctl: Controller) {}

  onStart() {
    console.log('EditSession started');
  }
}

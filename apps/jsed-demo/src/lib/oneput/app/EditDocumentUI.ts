import type { AppObject, Controller } from '@oneput/oneput';
import type { LayoutSettings } from './_layout.js';
import { OneputEditDocumentAdapter } from '@oneput/jsed/ui/oneput/app';
import type { EditorError, JsedDocument } from '@oneput/jsed';

export class EditDocumentUI implements AppObject {
  static create(ctl: Controller, { document }: { document: JsedDocument }) {
    const instance = new EditDocumentUI(ctl, {
      adapter: (instance: EditDocumentUI) =>
        OneputEditDocumentAdapter.create(ctl, {
          document,
          onRenderMenuItems: instance.renderMenuItems,
          onEditError: instance.handleEditError
        })
    });
    return instance;
  }

  private adapter: OneputEditDocumentAdapter;
  public actions: AppObject['actions'];

  constructor(
    private ctl: Controller,
    private create: { adapter: (inst: EditDocumentUI) => OneputEditDocumentAdapter }
  ) {
    this.adapter = this.create.adapter(this);
    this.actions = this.adapter.actions;
  }

  onStart = () => {
    this.ctl.ui.update<LayoutSettings>({ params: { menuTitle: 'Editing' } });
    this.adapter.start();
  };

  onResume = () => {
    this.ctl.ui.update<LayoutSettings>({ params: { menuTitle: 'Editing' } });
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

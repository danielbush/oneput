import { JsedDocument } from './JsedDocument';
import { Navigator } from './Navigator';

export type JsedInputSelectionState =
  | 'SELECT_ALL'
  | 'SELECT_PARTIAL'
  | 'CURSOR_AT_BEGINNING'
  | 'CURSOR_AT_MIDDLE'
  | 'CURSOR_AT_END'
  | 'EMPTY';

export type SetInputChangeListener = (fn: (input: string) => void) => () => void;
export type SetSelectionChangeListener = (
  fn: (selection: JsedInputSelectionState) => void
) => () => void;

export class EditManager {
  static create({
    doc,
    nav,
    onInputChange,
    onSelectionChange
  }: {
    doc: JsedDocument;
    nav: Navigator;
    onInputChange: SetInputChangeListener;
    onSelectionChange: SetSelectionChangeListener;
  }): EditManager {
    return new EditManager(doc, nav, onInputChange, onSelectionChange);
  }

  private unsubscribeOnInputChange: () => void;
  private unsubscribeOnSelectionChange: () => void;

  constructor(
    private doc: JsedDocument,
    private nav: Navigator,
    private onInputChange: SetInputChangeListener,
    private onSelectionChange: SetSelectionChangeListener
  ) {
    this.unsubscribeOnInputChange = this.onInputChange(this.handleInputChange);
    this.unsubscribeOnSelectionChange = this.onSelectionChange(this.handleSelectionChange);
  }

  public close() {
    this.unsubscribeOnInputChange();
    this.unsubscribeOnSelectionChange();
  }

  private handleInputChange = (input: string) => {
    //
  };

  private handleSelectionChange = (selection: JsedInputSelectionState) => {
    //
  };
}

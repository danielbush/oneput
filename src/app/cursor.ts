import { DocumentContext, IJsedCursor } from './DocumentContext';
import * as token from '../lib/token';
import * as action from '../lib/action';

export class JsedCursor implements IJsedCursor {
  #context: DocumentContext;
  constructor(params: { context: DocumentContext }) {
    this.#context = params.context;
  }
  #getActiveTokenOrDie(): HTMLElement {
    if (this.#context.activeToken) {
      return this.#context.activeToken;
    }
    const err = new Error('JsedCursor: activeToken not set when it should be!');
    throw err;
  }
  getToken() {
    return this.#getActiveTokenOrDie();
  }
  moveNext() {
    if (!this.#context.activeToken) {
      return;
    }
    const prevToken = token.getNextSibling(this.#context.activeToken);
    if (prevToken) {
      action.FOCUS(this.#context, prevToken);
    }
  }
  movePrevious() {
    if (!this.#context.activeToken) {
      return;
    }
    const prevToken = token.getPreviousSibling(this.#context.activeToken);
    if (prevToken) {
      action.FOCUS(this.#context, prevToken);
    }
  }
  replace(val: string) {
    const tok = this.#getActiveTokenOrDie();
    const maybeNewTok = token.replaceText(tok, val);
    if (tok !== maybeNewTok) {
      // We don't want to cause a focus event unless the TOKEN has changed.  Set
      // the replaced flag to indicate to the consumer that the activeToken is
      // in fact replaced.
      action.FOCUS(this.#context, maybeNewTok, { replaced: true });
    }
  }
  delete() {
    const tok = this.#getActiveTokenOrDie();
    const newToken = token.remove(tok);
    action.FOCUS(this.#context, newToken);
    return;
  }
  append(val: string): HTMLElement {
    const tok = token.createToken(val);
    token.insertAfter(tok, this.#getActiveTokenOrDie());
    return tok;
  }
  focus(el: HTMLElement): boolean {
    if (token.isToken(el)) {
      action.FOCUS(this.#context, el);
      return true;
    }
    return false;
  }
  prepend() {}
  close() {}
}

import type { Controller } from '@oneput/oneput';
import * as jsed from '@oneput/jsed';
import { Document } from '../../oneput/app/Document.js';
import { errAsync, ResultAsync, err, ok } from 'neverthrow';

export type FetchError =
  | { type: 'network'; cause: Error }
  | { type: 'http'; status: number; statusText: string };

/**
 * Use neverthrow.  Returns an Err if the fetch fails or status is not OK.
 */
function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
  return ResultAsync.fromPromise(
    fetch(input, init),
    (e): FetchError => ({ type: 'network', cause: e as Error })
  ).andThen((response) =>
    response.ok
      ? ok(response)
      : err<Response, FetchError>({
          type: 'http',
          status: response.status,
          statusText: response.statusText
        })
  );
}

export type TestDocError = { type: 'missing-element'; id: string };

/**
 * Standalone actions we can import and use in menus, buttons etc.
 */
export class TestDocService {
  static create(ctl: Controller) {
    return new TestDocService(ctl, { fetch: safeFetch });
  }
  constructor(
    private ctl: Controller,
    private params: { fetch: typeof safeFetch }
  ) {}

  loadTestDoc() {
    const docRoot = document.getElementById('load-doc');
    if (!docRoot) {
      return errAsync<void, TestDocError>({ type: 'missing-element', id: 'load-doc' });
    }
    return this.params
      .fetch('/api/docs/test_doc')
      .andThen((response) =>
        ResultAsync.fromPromise(
          response.text(),
          (e): FetchError => ({ type: 'network', cause: e as Error })
        )
      )
      .map((html) => {
        docRoot.innerHTML = html;
        this.ctl.app.run(
          Document.create(this.ctl, {
            document: jsed.JsedDocument.create(docRoot)
          })
        );
        this.ctl.menu.closeMenu();
      });
  }
}

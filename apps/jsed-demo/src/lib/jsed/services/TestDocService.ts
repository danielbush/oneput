import { Fetch, type FetchError } from '@oneput/oneput/shared/Fetch.js';
import { errAsync, ResultAsync } from 'neverthrow';

export type TestDocError = { type: 'missing-element'; id: string };

/**
 * Standalone actions we can import and use in menus, buttons etc.
 */
export class TestDocService {
  static create() {
    return new TestDocService(Fetch.create().fetch);
  }
  constructor(private fetch: Fetch['fetch']) {}

  loadTestDoc(): ResultAsync<HTMLElement, TestDocError | FetchError> {
    const docRoot = document.getElementById('load-doc');
    if (!docRoot) {
      return errAsync({ type: 'missing-element' as const, id: 'load-doc' });
    }
    return this.fetch('/api/docs/test_doc')
      .andThen((response) =>
        ResultAsync.fromPromise(
          response.text(),
          (e): FetchError => ({ type: 'network', cause: e as Error })
        )
      )
      .map((html) => {
        docRoot.innerHTML = html;
        return docRoot;
      });
  }
}

import { errAsync, ResultAsync, err, ok } from 'neverthrow';

export type FetchError =
  | { type: 'network'; cause: Error }
  | { type: 'http'; status: number; statusText: string };

class Fetch {
  static create() {
    return new Fetch();
  }

  fetch = (input: RequestInfo | URL, init?: RequestInit) => {
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
  };
}

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

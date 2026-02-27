import { ResultAsync, err, ok } from 'neverthrow';

export type FetchError =
  | { type: 'network'; cause: Error }
  | { type: 'http'; status: number; statusText: string };

export class Fetch {
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

import { err, ok, type Result } from 'neverthrow';
import { TestInputService } from '../../service/TestInputService.js';

export type SearchItem = { id: string; text: string };
export type SearchFailure = { message: string };

type SearchResult = Result<readonly SearchItem[], SearchFailure>;
type NullSearchOptions = {
  response?: (query: string) => { result: SearchResult; delayMs?: number };
  clock?: { setTimeout(resolve: () => void, delay: number): unknown };
};

/** Give the original demo service and its nullable the same typed result. */
export class SearchService {
  static create() {
    const service = TestInputService.create();
    return new SearchService(async (query) => {
      try {
        return ok(await service.fetchData(query));
      } catch (error) {
        console.error(error);
        return err({ message: error instanceof Error ? error.message : String(error) });
      }
    });
  }

  static createNull({
    response = () => ({ result: ok([]) }),
    clock = { setTimeout }
  }: NullSearchOptions = {}) {
    return new SearchService(async (query) => {
      const { result, delayMs = 0 } = response(query);
      if (delayMs > 0) {
        await new Promise<void>((resolve) => clock.setTimeout(resolve, delayMs));
      }
      return result;
    });
  }

  private searches?: Array<{ query: string; response: Promise<SearchResult> }>;

  private constructor(private readonly respond: (query: string) => Promise<SearchResult>) {}

  search(query: string) {
    const response = this.respond(query);
    this.searches?.push({ query, response });
    return response;
  }

  /** Track each search from now on and its response, for example to wait for a stale response. */
  trackSearches() {
    const data: Array<{ query: string; response: Promise<SearchResult> }> = [];
    this.searches = data;
    return { data };
  }
}

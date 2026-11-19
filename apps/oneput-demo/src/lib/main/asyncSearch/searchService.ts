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

  private constructor(readonly search: (query: string) => Promise<SearchResult>) {}
}

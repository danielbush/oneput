import { err, ok, type Result } from 'neverthrow';

type Provider = { id: string; name: string; statusText: string };
type FetchError = { _tag: 'FetchFailed'; message: string };

export type ProviderContext = {
  providers: readonly Provider[];
  fetchError: FetchError | null;
};

export type SelectProvider = { type: 'SELECT_PROVIDER'; providerId: string };
export type ProviderLoad = Result<readonly Provider[], FetchError>;
export type LoadProviders = (publish: (result: ProviderLoad) => void) => () => void;

const sampleProviders: readonly Provider[] = [
  { id: 'openai', name: 'OpenAI', statusText: 'Available' },
  { id: 'anthropic', name: 'Anthropic', statusText: 'Available' }
];

/** Make a fresh simulated source for one opening of the provider list. */
export function simulateProviderLoad({ failFirst = false, empty = false } = {}): LoadProviders {
  let failNext = failFirst;

  return (publish) => {
    const result: ProviderLoad = failNext
      ? err({ _tag: 'FetchFailed', message: 'Try again' })
      : ok(empty ? [] : sampleProviders);
    failNext = false;
    const timer = setTimeout(() => publish(result), 300);
    return () => clearTimeout(timer);
  };
}

/** Read the latest provider rows and failure detail from the actor snapshot. */
export const sources = {
  text: {
    fetchMessage: ({ fetchError }: ProviderContext) => fetchError?.message ?? ''
  },
  lists: {
    providers: ({ providers }: ProviderContext) =>
      providers.map(({ id, name, statusText }) => ({
        id,
        text: name,
        detail: statusText,
        activate: true
      }))
  },
  release: {}
};

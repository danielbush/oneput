import { menuItem } from '@oneput/oneput';
import { readable } from '@oneput/oneput/shared/declarative/interpreter.js';
import { Signal } from 'signal-polyfill';
import type { Online } from '../../common/online.js';
import { signalSource } from '@oneput/oneput/shared/declarative/signalSource.js';
import type { SearchFailure, SearchItem } from '../../service/SearchService.js';

export type SearchContext = {
  query: string | null;
  results: readonly SearchItem[];
  error: SearchFailure | null;
  selected: string | null;
};

type SearchSnapshot = { context: SearchContext };

export function resultById(context: SearchContext, id: string) {
  return context.results.find((result) => result.id === id);
}

/**
 * The view sources for this declarative AppObject: the named data its views
 * refer to. A view in the machine's `meta.view` names a source (a `text` for a
 * slot, a `menu` entry for its menu rows, a `menuItem` builder for a row), and
 * the interpreter looks the name up here each time it draws the view. So the
 * machine says what to show by name, and this file says where that comes from.
 *
 * Most sources read the machine's snapshot. A source for data the machine does
 * not own is marked `readable`; here the title reads the host's `online` signal.
 */
export function createContent(online: Online) {
  return {
    text: {
      title: readable(
        signalSource(
          new Signal.Computed(() =>
            online.state.get() ? 'Async Search Example' : 'Async Search Example (offline)'
          )
        )
      ),
      emptyStatus: ({ context }: SearchSnapshot) => (context.query === null ? '' : 'Ready'),
      resultStatus: ({ context }: SearchSnapshot) =>
        context.selected === null ? 'Ready' : `Selected: ${context.selected}`,
      searchError: ({ context }: SearchSnapshot) => context.error?.message ?? ''
    },
    menu: {
      results: ({ context }: SearchSnapshot) =>
        context.results.map(({ id }) => ({ id, build: 'result' as const }))
    },
    menuItem: {
      // Built with menuItem, not stdMenuItem, to show a custom builder.
      result: ({ context }: SearchSnapshot, row: { id: string }, activate: () => void) =>
        menuItem({
          id: row.id,
          tag: 'button',
          attr: { type: 'button' },
          action: activate,
          children: (b) => [
            b.icon('Dot'),
            b.fchild({ textContent: `Result: '${resultById(context, row.id)?.text ?? ''}'` })
          ]
        })
    }
  };
}

export type SearchContent = ReturnType<typeof createContent>;

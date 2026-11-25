import { menuItem } from '@oneput/oneput';
import { readable, rowBuilder, slot } from '@oneput/oneput/shared/declarative/interpreter.js';
import { Signal } from 'signal-polyfill';
import type { Online } from '../../common/online.js';
import { signalSource } from '@oneput/oneput/shared/declarative/signalSource.js';
import { infoRow, standardRow } from '@oneput/oneput/shared/declarative/standardRow.js';
import type { SearchFailure, SearchItem } from '../../service/SearchService.js';

export type SearchContext = {
  query: string | null;
  results: readonly SearchItem[];
  error: SearchFailure | null;
  selected: string | null;
};

type SearchSnapshot = { context: SearchContext };

/**
 * The view sources for this declarative AppObject: the named data its views
 * refer to. A view in the machine's `meta.view` names a source (a `slot` source
 * for a layout param, a slot or a row param, a `menu` entry for its menu rows, a `menuItem`
 * builder for a row), and the interpreter looks the name up here each time it
 * draws the view. A `slot` source gives the type that its slot or param
 * declares; here all of them give text, and `title` fills the `menuTitle`
 * layout param. The `default` builder draws the rows
 * that name no builder. So the machine says what to show by name, and this
 * file says where that comes from.
 *
 * Most sources read the machine's snapshot. A source for data the machine does
 * not own is marked `readable`; here the title reads the host's `online` signal.
 */
export function createContent(online: Online) {
  return {
    slot: {
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
      // Each row carries its result's text as the `result` builder's `text`
      // param, and sends its result's ID when the user activates it.
      results: ({ context }: SearchSnapshot) =>
        context.results.map(({ id, text }) => ({
          id,
          build: 'result' as const,
          params: { text },
          send: { type: 'RESULT_ACTIVATED' as const, id }
        }))
    },
    menuItem: {
      default: standardRow,
      info: infoRow,
      // Built with menuItem, not stdMenuItem, to show a custom builder.
      result: rowBuilder({
        params: { text: slot<string>() },
        build: ({ id, params: { text } }, activate) =>
          menuItem({
            id,
            tag: 'button',
            attr: { type: 'button' },
            action: activate,
            children: (b) => [b.icon('Dot'), b.fchild({ textContent: `Result: '${text}'` })]
          })
      })
    }
  };
}

export type SearchContent = ReturnType<typeof createContent>;

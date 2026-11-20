import { afterEach, describe, expect, test } from 'vitest';
import { Controller } from '../../controllers/controller.js';
import { menuItem } from '../../lib/builder.js';
import type { FChildParams, MenuItem } from '../../types.js';
import { renderActiveView, type ViewDef, type ViewSources } from './interpreter.js';

type PageEvent = { type: 'NEXT_PAGE' } | { type: 'PREVIOUS_PAGE' };
type PageView = ViewDef<'pageText', 'pages', PageEvent, 'badge' | 'anonymous'>;
/** A view type that a machine declares apart from its sources: any name type-checks. */
type WideView = ViewDef<string, string, PageEvent, string>;

/** A one-state actor whose events change its page and its last activated row. */
function createPages<View extends PageView | WideView>(view: View) {
  const state = { page: 1, activated: null as string | null };
  const pages = {
    send(event: PageEvent | { type: 'ITEM_ACTIVATED'; id: string }) {
      if (event.type === 'NEXT_PAGE') state.page += 1;
      else if (event.type === 'PREVIOUS_PAGE') state.page -= 1;
      else state.activated = event.id;
      pages.snapshot = snapshotOf();
    },
    snapshot: snapshotOf()
  };
  function snapshotOf() {
    return {
      ...state,
      machine: { getStateNodeById: () => ({ path: [] }) },
      getMeta: () => ({ root: { view } })
    };
  }
  return pages;
}

type Snapshot = { page: number };

function pageSegments(page: number) {
  return [{ text: 'Page ' }, { text: String(page), emphasis: true }];
}

const sources = {
  text: { pageText: ({ page }: Snapshot) => `Page ${page}` },
  lists: { pages: () => [{ id: 'list-row', build: 'badge' as const }] },
  items: {
    badge: ({ page }: Snapshot, row: { id: string }, activate: () => void) =>
      menuItem({
        id: row.id,
        action: activate,
        children: (b) => [b.fchild({ textSegments: pageSegments(page) })]
      }),
    anonymous: ({ page }: Snapshot, _row: unknown, activate: () => void) =>
      menuItem({
        action: activate,
        children: [{ id: 'x', type: 'fchild', textContent: `${page}` }]
      })
  }
} satisfies ViewSources<Snapshot, 'pageText', 'pages', PageEvent, 'badge' | 'anonymous'>;

/** The same sources, typed with any names as a registry declared apart from its views. */
const wideSources: ViewSources<Snapshot, string, string, PageEvent, string> = sources;

/** The interpreter puts only menu items in the menu. */
function render(pages: ReturnType<typeof createPages<PageView>>) {
  const view = renderActiveView(pages.snapshot, sources, pages.send)._unsafeUnwrap();
  return view.menu.items as MenuItem[];
}

const controllers: Controller[] = [];

afterEach(() => {
  for (const ctl of controllers) ctl.destroy();
  controllers.length = 0;
});

/** Click the item as the menu does. */
function click(item: MenuItem | undefined) {
  const ctl = Controller.createNull();
  controllers.push(ctl);
  item?.action?.(ctl);
}

function segments(item: MenuItem | undefined) {
  return (item?.children?.[0] as FChildParams | undefined)?.textSegments;
}

function pagesWith(items: NonNullable<PageView['menu']>['items']) {
  return createPages<PageView>({ title: 'Pages', menu: { id: 'pages', items } });
}

describe('built rows', () => {
  test('view row sends its event', () => {
    // arrange
    const pages = pagesWith([{ id: 'next', build: 'badge', send: { type: 'NEXT_PAGE' } }]);
    const [item] = render(pages);

    // act
    click(item);

    // assert
    expect(item?.id).toBe('next');
    expect(segments(item)).toEqual(pageSegments(1));
    expect(segments(render(pages)[0])).toEqual(pageSegments(2));
  });

  test('list row without send activates its id', () => {
    // arrange
    const pages = createPages<PageView>({ title: 'Pages', menu: { id: 'pages', from: 'pages' } });
    const [item] = render(pages);

    // act
    click(item);

    // assert
    expect(item?.id).toBe('list-row');
    expect(pages.snapshot.activated).toBe('list-row');
  });

  test('row id wins over the builder id', () => {
    // arrange
    const pages = pagesWith([{ id: 'row', build: 'anonymous' }]);

    // act
    const ids = [render(pages)[0]?.id, render(pages)[0]?.id];

    // assert
    expect(ids).toEqual(['row', 'row']);
  });
});

describe('merging built rows', () => {
  test('build over standard', () => {
    // arrange
    const pages = pagesWith([
      { id: 'row', text: 'Standard' },
      { id: 'row', build: 'badge' }
    ]);

    // act
    const items = render(pages);

    // assert
    expect(items.map((item) => item.id)).toEqual(['row']);
    expect(segments(items[0])).toEqual(pageSegments(1));
  });

  test('send over build keeps the builder', () => {
    // arrange
    const pages = pagesWith([
      { id: 'row', build: 'badge', send: { type: 'PREVIOUS_PAGE' } },
      { id: 'row', send: { type: 'NEXT_PAGE' } }
    ]);
    const [item] = render(pages);

    // act
    click(item);

    // assert
    expect(segments(item)).toEqual(pageSegments(1));
    expect(pages.snapshot.page).toBe(2);
  });

  test('standard over build keeps the send', () => {
    // arrange
    const pages = pagesWith([
      { id: 'row', build: 'badge', send: { type: 'NEXT_PAGE' } },
      { id: 'row', text: 'Standard' }
    ]);
    const [item] = render(pages);

    // act
    click(item);

    // assert
    expect(JSON.stringify(item)).toContain('"textContent":"Standard"');
    expect(segments(item)).toBeUndefined();
    expect(pages.snapshot.page).toBe(2);
  });
});

describe('missing names', () => {
  test.each<[string, WideView]>([
    ['builder', { title: 'Pages', menu: { id: 'pages', items: [{ id: 'row', build: 'gone' }] } }],
    ['list', { title: 'Pages', menu: { id: 'pages', from: 'gone' } }],
    ['text', { title: { from: 'gone' }, menu: { id: 'pages' } }],
    [
      'row text',
      { title: 'Pages', menu: { id: 'pages', items: [{ id: 'row', text: { from: 'gone' } }] } }
    ]
  ])('%s', (_, view) => {
    // arrange
    const pages = createPages(view);

    // act
    const result = renderActiveView(pages.snapshot, wideSources, pages.send);

    // assert
    expect(result._unsafeUnwrapErr()).toBe('Expected a source for each name');
  });
});

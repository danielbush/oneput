import { afterEach, describe, expect, test } from 'vitest';
import { Controller } from '../../controllers/controller.js';
import { menuItem } from '../../lib/builder.js';
import type { AppLayoutParams, FChildParams, MenuItem, UILayout } from '../../types.js';
import {
  renderActiveView,
  viewLayout,
  type LayoutSlots,
  type ViewDef,
  type ViewLayouts,
  type ViewSources
} from './interpreter.js';

/** A layout component that keeps its params. These tests do not show it. */
function component(_ctl: Controller, params: AppLayoutParams): UILayout {
  let settings = params;
  return { configure: ({ params: next }) => (settings = { ...settings, ...next }) };
}

/** Test-only layouts: the interpreter knows no layout of its own. */
const layouts = {
  plain: viewLayout({
    slots: ['heading', 'note'],
    create: component,
    params: ({ heading, note }) => ({ menuTitle: [heading, note].filter(Boolean).join(' / ') })
  }),
  bare: viewLayout({
    slots: ['heading'],
    create: component,
    params: ({ heading }) => ({ menuTitle: `[${heading ?? ''}]` })
  })
};

type Layouts = LayoutSlots<typeof layouts>;

type PageEvent = { type: 'NEXT_PAGE' } | { type: 'PREVIOUS_PAGE' };
type PageView = ViewDef<'pageText', 'pages', PageEvent, 'badge' | 'anonymous', Layouts>;
/** A view type that a machine declares apart from its sources: any name type-checks. */
type WideView = ViewDef<string, string, PageEvent, string, Record<string, string>>;

/** The same layouts, typed with any names as a registry declared apart from its views. */
const wideLayouts: ViewLayouts = layouts;

/**
 * An actor whose events change its page and its last activated row.
 * Its active states are nested: each view is the child of the one before.
 */
function createPages<View extends PageView | WideView>(...views: View[]) {
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
      machine: {
        getStateNodeById: (id: string) => ({ path: Array.from({ length: Number(id) }, String) })
      },
      getMeta: () => Object.fromEntries(views.map((view, depth) => [String(depth), { view }]))
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

function renderView(pages: ReturnType<typeof createPages<PageView>>) {
  return renderActiveView(pages.snapshot, sources, layouts, pages.send);
}

/** The interpreter puts only menu items in the menu. */
function render(pages: ReturnType<typeof createPages<PageView>>) {
  return renderView(pages)._unsafeUnwrap().menu.items as MenuItem[];
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
  return createPages<PageView>({ layout: 'plain', menu: { id: 'pages', items } });
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
    const pages = createPages<PageView>({ layout: 'plain', menu: { id: 'pages', from: 'pages' } });
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

describe('layouts', () => {
  test('slots merge by key', () => {
    // arrange
    const pages = createPages<PageView>(
      { layout: 'plain', slots: { heading: 'Parent', note: 'Parent note' }, menu: { id: 'pages' } },
      { slots: { note: { from: 'pageText' } } }
    );

    // act
    const view = renderView(pages);

    // assert
    expect(view._unsafeUnwrap().layout).toMatchObject({
      name: 'plain',
      params: { menuTitle: 'Parent / Page 1' }
    });
  });

  test('another layout drops the parent slots', () => {
    // arrange
    const pages = createPages<PageView>(
      { layout: 'plain', slots: { heading: 'Pages', note: 'Note' }, menu: { id: 'pages' } },
      { layout: 'bare', slots: { heading: 'Child' } }
    );

    // act
    const view = renderView(pages);

    // assert
    expect(view._unsafeUnwrap().layout).toMatchObject({
      name: 'bare',
      params: { menuTitle: '[Child]' }
    });
  });

  test('slot the layout does not declare', () => {
    // arrange
    const pages = createPages<PageView>(
      { layout: 'bare', menu: { id: 'pages' } },
      { slots: { note: 'Offline' } }
    );

    // act
    const view = renderView(pages);

    // assert
    expect(view._unsafeUnwrapErr()).toBe('Expected only slots that the layout declares');
  });

  test('undeclared slot with no value', () => {
    // arrange
    const pages = createPages<PageView>(
      { layout: 'bare', menu: { id: 'pages' } },
      { slots: { note: undefined } }
    );

    // act
    const view = renderView(pages);

    // assert
    expect(view._unsafeUnwrapErr()).toBe('Expected only slots that the layout declares');
  });

  // Layouts cannot declare these names; a view typed apart can still fill them.
  test.each(['toString', '__proto__'])('slot named %s from a view typed apart', (slot) => {
    // arrange
    const pages = createPages<WideView>(
      { layout: 'plain', slots: { heading: 'A' }, menu: { id: 'pages' } },
      { slots: Object.fromEntries([[slot, 'B']]) }
    );

    // act
    const view = renderActiveView(pages.snapshot, wideSources, wideLayouts, pages.send);

    // assert
    expect(view._unsafeUnwrapErr()).toBe('Expected only slots that the layout declares');
  });

  test('child clears the input', () => {
    // arrange
    const pages = createPages<PageView>(
      { layout: 'plain', input: { kind: 'filter', placeholder: 'Type' }, menu: { id: 'pages' } },
      { input: undefined }
    );

    // act
    const view = renderView(pages);

    // assert
    expect(view._unsafeUnwrap().placeholder).toBeUndefined();
  });

  test('no layout', () => {
    // arrange
    const pages = createPages<PageView>({ menu: { id: 'pages' } });

    // act
    const view = renderView(pages);

    // assert
    expect(view._unsafeUnwrapErr()).toBe('Expected a complete active view');
  });
});

describe('missing names', () => {
  test.each<[string, WideView]>([
    ['layout', { layout: 'gone', menu: { id: 'pages' } }],
    ['builder', { layout: 'plain', menu: { id: 'pages', items: [{ id: 'row', build: 'gone' }] } }],
    ['list', { layout: 'plain', menu: { id: 'pages', from: 'gone' } }],
    ['slot text', { layout: 'plain', slots: { heading: { from: 'gone' } }, menu: { id: 'pages' } }],
    [
      'row text',
      { layout: 'plain', menu: { id: 'pages', items: [{ id: 'row', text: { from: 'gone' } }] } }
    ]
  ])('%s', (_, view) => {
    // arrange
    const pages = createPages(view);

    // act
    const result = renderActiveView(pages.snapshot, wideSources, wideLayouts, pages.send);

    // assert
    expect(result._unsafeUnwrapErr()).toBe('Expected a source for each name');
  });
});

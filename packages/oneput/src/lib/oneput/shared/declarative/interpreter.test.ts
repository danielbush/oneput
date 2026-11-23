import { afterEach, describe, expect, test } from 'vitest';
import { Controller } from '../../controllers/controller.js';
import { menuItem } from '../../lib/builder.js';
import { cell } from '../../lib/pull.js';
import type { AppLayoutParams, FChildParams, MenuItem, UILayout } from '../../types.js';
import {
  renderActiveView,
  viewLayout,
  type LayoutSlots,
  type ViewDef,
  readable,
  sourceSubscriptions,
  type ViewLayouts,
  type ViewSources
} from './interpreter.js';
import { standardRow } from './standardRow.js';

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
type PageView = ViewDef<'pageText', 'pages', PageEvent, 'badge' | 'pageNumber', Layouts>;
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
  menu: { pages: () => [{ id: 'list-row', build: 'badge' as const }] },
  menuItem: {
    badge: ({ page }: Snapshot, row: { id: string }, activate: () => void) =>
      menuItem({
        id: row.id,
        action: activate,
        children: (b) => [b.fchild({ textSegments: pageSegments(page) })]
      }),
    pageNumber: ({ page }: Snapshot, row: { id: string }, activate: () => void) =>
      menuItem({
        id: row.id,
        action: activate,
        children: (b) => [b.fchild({ textContent: String(page) })]
      })
  }
} satisfies ViewSources<Snapshot, 'pageText', 'pages', PageEvent, 'badge' | 'pageNumber'>;

/** The same sources, typed with any names as a registry declared apart from its views. */
const wideSources: ViewSources<Snapshot, string, string, PageEvent, string> = sources;

function renderView(pages: ReturnType<typeof createPages<PageView>>) {
  return renderActiveView(pages.snapshot, sources, layouts, {
    defaultRow: standardRow,
    activate: pages.send
  });
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

test('plain row uses the passed builder', () => {
  // arrange
  const pages = pagesWith([
    { id: 'details', text: { from: 'pageText' }, detail: 'Details', activate: true }
  ]);
  let builtItem: MenuItem | undefined;

  // act
  const view = renderActiveView(pages.snapshot, sources, layouts, {
    defaultRow: ({ id, text, detail }, action) => {
      builtItem = menuItem({
        id,
        action,
        children: (b) => [b.fchild({ textContent: `${text}: ${detail}` })]
      });
      return builtItem;
    },
    activate: pages.send
  })._unsafeUnwrap();
  const [item] = view.menu.items as MenuItem[];
  click(item);

  // assert
  expect(item).toBe(builtItem);
  expect(item).toMatchObject({
    id: 'details',
    children: [{ textContent: 'Page 1: Details' }]
  });
  expect(pages.snapshot.activated).toBe('details');
});

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
});

describe('list rows', () => {
  test('duplicate ids keep both rows in list order', () => {
    // arrange
    const registry = {
      ...sources,
      menu: {
        pages: () => [
          { id: 'same', text: 'First' },
          { id: 'same', text: 'Second' }
        ]
      }
    };
    const pages = createPages<PageView>({ layout: 'plain', menu: { id: 'pages', from: 'pages' } });

    // act
    const { menu } = renderActiveView(pages.snapshot, registry, layouts, {
      defaultRow: ({ id, text }) =>
        menuItem({ id, children: (b) => [b.fchild({ textContent: text })] }),
      activate: pages.send
    })._unsafeUnwrap();

    // assert
    expect(menu.items).toMatchObject([
      { id: 'same', children: [{ textContent: 'First' }] },
      { id: 'same', children: [{ textContent: 'Second' }] }
    ]);
  });

  test('fixed rows follow list rows and keep their own fields', () => {
    // arrange
    const pages = createPages<PageView>({
      layout: 'plain',
      menu: { id: 'pages', from: 'pages', items: [{ id: 'list-row', text: 'Fixed' }] }
    });

    // act
    const items = render(pages);

    // assert
    expect(items.map((item) => item.id)).toEqual(['list-row', 'list-row']);
    expect(segments(items[0])).toEqual(pageSegments(1));
    expect(JSON.stringify(items[1])).toContain('"textContent":"Fixed"');
  });
});

describe('fixed row overrides', () => {
  test('child builder replaces the parent content in place', () => {
    // arrange
    const pages = createPages<PageView>(
      {
        layout: 'plain',
        menu: {
          id: 'pages',
          items: [
            { id: 'row', text: 'Parent' },
            { id: 'parent-only', text: 'Parent only' }
          ]
        }
      },
      {
        menu: {
          items: [
            { id: 'child-only', text: 'Child only' },
            { id: 'row', build: 'badge' }
          ]
        }
      }
    );

    // act
    const items = render(pages);

    // assert
    expect(items.map((item) => item.id)).toEqual(['row', 'parent-only', 'child-only']);
    expect(segments(items[0])).toEqual(pageSegments(1));
  });

  test('send over build keeps the builder', () => {
    // arrange
    const pages = createPages<PageView>(
      {
        layout: 'plain',
        menu: {
          id: 'pages',
          items: [{ id: 'row', build: 'badge', send: { type: 'PREVIOUS_PAGE' } }]
        }
      },
      { menu: { items: [{ id: 'row', send: { type: 'NEXT_PAGE' } }] } }
    );
    const [item] = render(pages);

    // act
    click(item);

    // assert
    expect(segments(item)).toEqual(pageSegments(1));
    expect(pages.snapshot.page).toBe(2);
  });

  test('standard over build keeps the send', () => {
    // arrange
    const pages = createPages<PageView>(
      {
        layout: 'plain',
        menu: { id: 'pages', items: [{ id: 'row', build: 'badge', send: { type: 'NEXT_PAGE' } }] }
      },
      { menu: { items: [{ id: 'row', text: 'Standard' }] } }
    );
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
    const view = renderActiveView(pages.snapshot, wideSources, wideLayouts, {
      defaultRow: standardRow,
      activate: pages.send
    });

    // assert
    expect(view._unsafeUnwrapErr()).toBe('Expected only slots that the layout declares');
  });

  test('input with no kind is a text input', () => {
    // arrange
    const pages = createPages<PageView>({
      layout: 'plain',
      input: { placeholder: 'Type' },
      menu: { id: 'pages' }
    });

    // act
    const view = renderView(pages)._unsafeUnwrap();

    // assert
    expect(view.layout.params.input).toEqual({ kind: 'text' });
    expect(view.placeholder).toBe('Type');
  });

  test('child replaces the input', () => {
    // arrange
    const pages = createPages<PageView>(
      { layout: 'plain', input: { placeholder: 'Type' }, menu: { id: 'pages' } },
      { input: { kind: 'textarea', rows: 3, placeholder: { from: 'pageText' } } }
    );

    // act
    const view = renderView(pages)._unsafeUnwrap();

    // assert
    expect(view.layout.params.input).toEqual({ kind: 'textarea', rows: 3 });
    expect(view.placeholder).toBe('Page 1');
  });

  test('child clears the input', () => {
    // arrange
    const pages = createPages<PageView>(
      { layout: 'plain', input: { kind: 'password', placeholder: 'Key' }, menu: { id: 'pages' } },
      { input: undefined }
    );

    // act
    const view = renderView(pages)._unsafeUnwrap();

    // assert
    expect(view.layout.params.input).toBeUndefined();
    expect(view.placeholder).toBeUndefined();
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
    const result = renderActiveView(pages.snapshot, wideSources, wideLayouts, {
      defaultRow: standardRow,
      activate: pages.send
    });

    // assert
    expect(result._unsafeUnwrapErr()).toBe('Expected a source for each name');
  });
});

describe('readable sources', () => {
  /** A registry that mixes readable sources with snapshot functions. */
  function mixedPages() {
    const heading = cell('First');
    const rows = cell<readonly { id: string; build: 'badge' | 'pageNumber' }[]>([
      { id: 'list-row', build: 'badge' },
      { id: 'snapshot-row', build: 'pageNumber' }
    ]);
    const label = cell('Label A');
    const badge = cell((row: { id: string }, activate: () => void) =>
      menuItem({
        id: row.id,
        action: activate,
        children: (b) => [b.fchild({ textContent: label.get() })]
      })
    );
    const mixed = {
      text: { pageText: readable(heading) },
      menu: { pages: readable(rows) },
      menuItem: { badge: readable(badge), pageNumber: sources.menuItem.pageNumber }
    } satisfies ViewSources<Snapshot, 'pageText', 'pages', PageEvent, 'badge' | 'pageNumber'>;
    const pages = createPages<PageView>({
      layout: 'plain',
      slots: { heading: { from: 'pageText' } },
      menu: { id: 'pages', from: 'pages' }
    });
    const render = () =>
      renderActiveView(pages.snapshot, mixed, layouts, {
        defaultRow: standardRow,
        activate: pages.send
      })._unsafeUnwrap();
    return { heading, rows, label, badge, mixed, pages, render };
  }

  test('each source is read by its own mark', () => {
    // arrange
    const { heading, label, render } = mixedPages();
    const before = render();

    // act
    heading.set('Second');
    label.set('Label B');
    const after = render();

    // assert
    expect(before.layout.params).toEqual({ menuTitle: 'First' });
    expect(after.layout.params).toEqual({ menuTitle: 'Second' });
    expect(after.menu.items.map((item) => item && item.id)).toEqual(['list-row', 'snapshot-row']);
    expect(JSON.stringify(after.menu.items)).toContain('Label B');
    expect(JSON.stringify(after.menu.items)).toContain('"textContent":"1"');
  });

  test('built row from a readable builder activates its id', () => {
    // arrange
    const { pages, render } = mixedPages();
    const [item] = render().menu.items as MenuItem[];

    // act
    click(item);

    // assert
    expect(item?.id).toBe('list-row');
    expect(pages.snapshot.activated).toBe('list-row');
  });

  test('subscriptions are the marked sources only', () => {
    // arrange
    const { heading, rows, badge, mixed } = mixedPages();

    // act
    const subscriptions = sourceSubscriptions(mixed);

    // assert
    expect(subscriptions).toEqual([heading, rows, badge]);
  });

  // A callable object with get and subscribe looks like both kinds; only the mark counts.
  const both = Object.assign(() => 'Called', { get: () => 'Got', subscribe: () => () => {} });

  test.each([
    ['unmarked callable is called and not subscribed', both, 'Called', []],
    ['marked callable is read with get and subscribed', readable(both), 'Got', [both]]
  ])('%s', (_, pageText, title, subscribed) => {
    // arrange
    const registry = { ...sources, text: { pageText } };
    const pages = createPages<PageView>({
      layout: 'plain',
      slots: { heading: { from: 'pageText' } },
      menu: { id: 'pages' }
    });

    // act
    const view = renderActiveView(pages.snapshot, registry, layouts, {
      defaultRow: standardRow,
      activate: pages.send
    });

    // assert
    expect(view._unsafeUnwrap().layout.params).toEqual({ menuTitle: title });
    expect(sourceSubscriptions(registry)).toEqual(subscribed);
  });

  test('an unmarked object with subscribe is not subscribed', () => {
    // arrange
    const registry = { text: {}, menu: {}, menuItem: { odd: { subscribe: true } } };

    // act
    const subscriptions = sourceSubscriptions(registry);

    // assert
    expect(subscriptions).toEqual([]);
  });

  const throwing = {
    get: (): never => {
      throw new Error('Broken');
    },
    subscribe: () => () => {}
  };

  test.each([
    [
      'text',
      { ...sources, text: { pageText: readable(throwing) } },
      { menu: { id: 'pages' }, slots: { heading: { from: 'pageText' } } }
    ],
    [
      'list',
      { ...sources, menu: { pages: readable(throwing) } },
      { menu: { id: 'pages', from: 'pages' } }
    ],
    [
      'builder',
      { ...sources, menuItem: { ...sources.menuItem, badge: readable(throwing) } },
      { menu: { id: 'pages', items: [{ id: 'row', build: 'badge' }] } }
    ]
  ] as const)('readable %s that throws gives the read error', (_, registry, view) => {
    // arrange
    const pages = createPages<PageView>({ layout: 'plain', ...view });

    // act
    const result = renderActiveView(pages.snapshot, registry, layouts, {
      defaultRow: standardRow,
      activate: pages.send
    });

    // assert
    expect(result._unsafeUnwrapErr()).toBe('Expected each source to read without an error');
  });

  test('a name that is not enumerable is neither read nor subscribed', () => {
    // arrange
    const text = {};
    Object.defineProperty(text, 'pageText', { value: readable(cell('Hidden')), enumerable: false });
    const registry = { ...sources, text } as typeof sources;
    const pages = createPages<PageView>({
      layout: 'plain',
      slots: { heading: { from: 'pageText' } },
      menu: { id: 'pages' }
    });

    // act
    const result = renderActiveView(pages.snapshot, registry, layouts, {
      defaultRow: standardRow,
      activate: pages.send
    });

    // assert
    expect(result._unsafeUnwrapErr()).toBe('Expected a source for each name');
    expect(sourceSubscriptions(registry)).toEqual([]);
  });

  test('a mark around a source with no get or subscribe is not subscribed', () => {
    // arrange
    const registry = {
      text: {},
      menu: {},
      menuItem: { unused: readable({} as never), fake: { kind: 'readable' } }
    };

    // act
    const subscriptions = sourceSubscriptions(registry);

    // assert
    expect(subscriptions).toEqual([]);
  });
});

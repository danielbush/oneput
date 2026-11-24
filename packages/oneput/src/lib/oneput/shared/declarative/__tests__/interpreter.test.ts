import { afterEach, describe, expect, test } from 'vitest';
import { Controller } from '../../../controllers/controller.js';
import { menuItem, type FlexChildBuilder } from '../../../lib/builder.js';
import { cell } from '../../../lib/pull.js';
import type { AppLayoutParams, FChildParams, MenuItem, UILayout } from '../../../types.js';
import {
  renderActiveView,
  rowBuilder,
  viewLayout,
  type LayoutSlots,
  type RowBuilders,
  type RowParams,
  type ViewDef,
  readable,
  slot,
  sourceSubscriptions,
  type ViewLayouts,
  type ViewRow,
  type ViewSources
} from '../interpreter.js';

/** A layout component. These tests do not show it. */
function component(_ctl: Controller, _params: AppLayoutParams): UILayout {
  return { configure: () => {} };
}

/** Content that a layout builds in place. */
type Footer = (b: FlexChildBuilder) => FChildParams;
type TypedParams = AppLayoutParams & { busy?: boolean; footer?: Footer };

/** Test-only layouts: the interpreter knows no layout of its own. */
const layouts = {
  plain: viewLayout({
    slots: { heading: slot<string>(), note: slot<string>() },
    create: component,
    params: ({ heading, note }) => ({ menuTitle: [heading, note].filter(Boolean).join(' / ') })
  }),
  bare: viewLayout({
    slots: { heading: slot<string>() },
    create: component,
    params: ({ heading }) => ({ menuTitle: `[${heading ?? ''}]` })
  }),
  // Keeps its values as they are, to show what reaches the layout.
  typed: viewLayout({
    slots: { busy: slot<boolean>(), footer: slot<Footer>() },
    create: (ctl, params: TypedParams) => component(ctl, params),
    params: ({ busy, footer }): TypedParams => ({ busy, footer })
  })
};

type Layouts = LayoutSlots<typeof layouts>;

function pageSegments(page: number) {
  return [{ text: 'Page ' }, { text: String(page), emphasis: true }];
}

/** Test-only row builders: the interpreter knows no row of its own. */
const builders = {
  // Shows its text and detail as one text, to show which params reach it.
  default: rowBuilder({
    params: { text: slot<string>(), detail: slot<string | undefined>() },
    build: ({ id, params: { text, detail } }, activate) =>
      menuItem({
        id,
        action: activate,
        children: (b) => [b.fchild({ textContent: [text, detail].filter(Boolean).join(': ') })]
      })
  }),
  badge: rowBuilder({
    params: { page: slot<number>() },
    build: ({ id, params: { page } }, activate) =>
      menuItem({
        id,
        action: activate,
        children: (b) => [b.fchild({ textSegments: pageSegments(page) })]
      })
  })
};

type PageEvent = { type: 'NEXT_PAGE' } | { type: 'PREVIOUS_PAGE' };
type PageSources = { pageText: string; labelText: string; page: number };
type Rows = RowParams<typeof builders>;
type PageView = ViewDef<PageSources, 'pages', PageEvent, Rows, Layouts>;
type TypedSources = PageSources & { laterPage: boolean; footer: Footer };
type TypedView = ViewDef<TypedSources, never, never, Rows, Layouts>;
/** A view type that a machine declares apart from its sources: any name type-checks. */
type WideView = ViewDef<
  Record<string, string>,
  string,
  PageEvent,
  Record<string, Record<string, string>>,
  Record<string, Record<string, string>>
>;

/** The same layouts, typed with any names as a registry declared apart from its views. */
const wideLayouts: ViewLayouts = layouts;

/**
 * An actor whose events change its page and its last activated row.
 * Its active states are nested: each view is the child of the one before.
 */
function createPages<View extends PageView | WideView | TypedView>(...views: View[]) {
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

const sources = {
  slot: {
    pageText: ({ page }: Snapshot) => `Page ${page}`,
    labelText: () => 'Label',
    page: ({ page }: Snapshot) => page
  },
  menu: {
    pages: () => [{ id: 'list-row', build: 'badge' as const, params: { page: 7 }, activate: true }]
  },
  menuItem: builders
} satisfies ViewSources<Snapshot, PageSources, 'pages', PageEvent, typeof builders>;

/** The text sources, typed with any names as a registry declared apart from its views. */
const wideSources: ViewSources<Snapshot, Record<string, string>, string, PageEvent, RowBuilders> = {
  ...sources,
  slot: { pageText: sources.slot.pageText }
};

function renderView(pages: ReturnType<typeof createPages<PageView>>) {
  return renderActiveView(pages.snapshot, sources, layouts, { activate: pages.send });
}

/** The interpreter puts only menu items in the menu. */
function render(pages: ReturnType<typeof createPages<PageView>>) {
  return renderView(pages)._unsafeUnwrap().menu.items as MenuItem[];
}

const controllers: Controller[] = [];

afterEach(() => {
  for (const ctl of controllers) ctl._destroy();
  controllers.length = 0;
});

/** Click the item as the menu does. */
function click(item: MenuItem | undefined) {
  const ctl = Controller.createNull();
  controllers.push(ctl);
  item?.action?.(ctl);
}

function firstChild(item: MenuItem | undefined) {
  return item?.children?.[0] as FChildParams | undefined;
}

function segments(item: MenuItem | undefined) {
  return firstChild(item)?.textSegments;
}

function text(item: MenuItem | undefined) {
  return firstChild(item)?.textContent;
}

function pagesWith(items: NonNullable<PageView['menu']>['items']) {
  return createPages<PageView>({ layout: 'plain', menu: { id: 'pages', items } });
}

describe('row builders', () => {
  test('row with no build uses the default builder', () => {
    // arrange
    const pages = pagesWith([
      { id: 'details', params: { text: { from: 'pageText' }, detail: 'Details' }, activate: true }
    ]);
    const [item] = render(pages);

    // act
    click(item);

    // assert
    expect(item?.id).toBe('details');
    expect(text(item)).toBe('Page 1: Details');
    expect(pages.snapshot.activated).toBe('details');
  });

  test('named builder gets its params and sends the row event', () => {
    // arrange
    const pages = pagesWith([
      {
        id: 'next',
        build: 'badge',
        params: { page: { from: 'page' } },
        send: { type: 'NEXT_PAGE' }
      }
    ]);
    const [item] = render(pages);

    // act
    click(item);

    // assert
    expect(item?.id).toBe('next');
    expect(segments(item)).toEqual(pageSegments(1));
    expect(segments(render(pages)[0])).toEqual(pageSegments(2));
  });

  test('row with no send or activate has no action', () => {
    // arrange
    const pages = pagesWith([{ id: 'help', params: { text: 'Help' } }]);

    // act
    const [item] = render(pages);

    // assert
    expect(text(item)).toBe('Help');
    expect(item?.action).toBeUndefined();
  });

  test('no default builder', () => {
    // arrange
    const registry = { ...wideSources, menuItem: { badge: builders.badge } };
    const pages = createPages<WideView>({
      layout: 'plain',
      menu: { id: 'pages', items: [{ id: 'row', params: { text: 'Row' } }] }
    });

    // act
    const result = renderActiveView(pages.snapshot, registry, wideLayouts, {
      activate: pages.send
    });

    // assert
    expect(result._unsafeUnwrapErr()).toBe('Expected a source for each name');
  });
});

describe('list rows', () => {
  test('list row with activate sends its id', () => {
    // arrange
    const pages = createPages<PageView>({ layout: 'plain', menu: { id: 'pages', from: 'pages' } });
    const [item] = render(pages);

    // act
    click(item);

    // assert
    expect(item?.id).toBe('list-row');
    expect(segments(item)).toEqual(pageSegments(7));
    expect(pages.snapshot.activated).toBe('list-row');
  });

  test('duplicate ids keep both rows in list order', () => {
    // arrange
    const registry = {
      ...sources,
      menu: {
        pages: () => [
          { id: 'same', params: { text: 'First' } },
          { id: 'same', params: { text: 'Second' } }
        ]
      }
    };
    const pages = createPages<PageView>({ layout: 'plain', menu: { id: 'pages', from: 'pages' } });

    // act
    const { menu } = renderActiveView(pages.snapshot, registry, layouts, {
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
      menu: { id: 'pages', from: 'pages', items: [{ id: 'list-row', params: { text: 'Fixed' } }] }
    });

    // act
    const items = render(pages);

    // assert
    expect(items.map((item) => item.id)).toEqual(['list-row', 'list-row']);
    expect(segments(items[0])).toEqual(pageSegments(7));
    expect(text(items[1])).toBe('Fixed');
  });
});

describe('fixed row overrides', () => {
  test('params merge by key', () => {
    // arrange
    const pages = createPages<PageView>(
      {
        layout: 'plain',
        menu: {
          id: 'pages',
          items: [
            { id: 'row', params: { text: 'Parent', detail: 'Detail' }, send: { type: 'NEXT_PAGE' } }
          ]
        }
      },
      { menu: { items: [{ id: 'row', params: { text: 'Child' } }] } }
    );
    const [item] = render(pages);

    // act
    click(item);

    // assert
    expect(text(item)).toBe('Child: Detail');
    expect(pages.snapshot.page).toBe(2);
  });

  test('child builder replaces the parent content in place', () => {
    // arrange
    const pages = createPages<PageView>(
      {
        layout: 'plain',
        menu: {
          id: 'pages',
          items: [
            { id: 'row', params: { text: 'Parent' } },
            { id: 'parent-only', params: { text: 'Parent only' } }
          ]
        }
      },
      {
        menu: {
          items: [
            { id: 'child-only', params: { text: 'Child only' } },
            { id: 'row', build: 'badge', params: { page: { from: 'page' } } }
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

  test('another builder drops the earlier params and keeps the send', () => {
    // arrange
    const pages = createPages<PageView>(
      {
        layout: 'plain',
        menu: {
          id: 'pages',
          items: [
            { id: 'row', params: { text: 'Parent', detail: 'Detail' }, send: { type: 'NEXT_PAGE' } }
          ]
        }
      },
      { menu: { items: [{ id: 'row', build: 'badge', params: { page: 3 } }] } },
      // No build: back to the default builder, with none of the parent's params.
      { menu: { items: [{ id: 'row', params: { text: 'Grandchild' } }] } }
    );
    const [item] = render(pages);

    // act
    click(item);

    // assert
    expect(text(item)).toBe('Grandchild');
    expect(pages.snapshot.page).toBe(2);
  });

  test('child send replaces the parent send', () => {
    // arrange
    const pages = createPages<PageView>(
      {
        layout: 'plain',
        menu: {
          id: 'pages',
          items: [
            {
              id: 'row',
              params: { text: 'Parent', detail: 'Detail' },
              send: { type: 'PREVIOUS_PAGE' }
            }
          ]
        }
      },
      { menu: { items: [{ id: 'row', params: { text: 'Child' }, send: { type: 'NEXT_PAGE' } }] } }
    );
    const [item] = render(pages);

    // act
    click(item);

    // assert
    expect(text(item)).toBe('Child: Detail');
    expect(pages.snapshot.page).toBe(2);
  });
});

describe('layouts', () => {
  const footer: Footer = (b) => b.fchild({ textContent: 'Footer' });
  const typedSources = {
    ...sources,
    slot: { ...sources.slot, laterPage: ({ page }: Snapshot) => page > 1, footer: () => footer }
  };

  test.each<[string, Extract<TypedView, { layout: 'typed' }>['slots']]>([
    ['literals', { busy: true, footer }],
    ['sources', { busy: { from: 'laterPage' }, footer: { from: 'footer' } }]
  ])('values that are not text reach the layout from %s', (name, slots) => {
    // arrange
    const pages = createPages<TypedView>({ layout: 'typed', slots, menu: { id: 'pages' } });

    // act
    const view = renderActiveView(pages.snapshot, typedSources, layouts, { activate: pages.send });

    // assert
    const { params } = view._unsafeUnwrap().layout;
    expect(params).toEqual({ busy: name === 'literals', footer });
    expect((params as TypedParams).footer).toBe(footer);
  });

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
      'row param',
      {
        layout: 'plain',
        menu: { id: 'pages', items: [{ id: 'row', params: { text: { from: 'gone' } } }] }
      }
    ]
  ])('%s', (_, view) => {
    // arrange
    const pages = createPages(view);

    // act
    const result = renderActiveView(pages.snapshot, wideSources, wideLayouts, {
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
    const label = cell('Label A');
    const rows = cell<readonly ViewRow<Rows, PageSources, PageEvent>[]>([
      { id: 'list-row', build: 'badge', params: { page: { from: 'page' } }, activate: true },
      { id: 'label-row', params: { text: { from: 'labelText' } } }
    ]);
    const mixed = {
      ...sources,
      slot: { pageText: readable(heading), labelText: readable(label), page: sources.slot.page },
      menu: { pages: readable(rows) }
    } satisfies ViewSources<Snapshot, PageSources, 'pages', PageEvent, typeof builders>;
    const pages = createPages<PageView>({
      layout: 'plain',
      slots: { heading: { from: 'pageText' } },
      menu: { id: 'pages', from: 'pages' }
    });
    const render = () =>
      renderActiveView(pages.snapshot, mixed, layouts, { activate: pages.send })._unsafeUnwrap();
    return { heading, rows, label, mixed, pages, render };
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
    const items = after.menu.items as MenuItem[];
    expect(before.layout.params).toEqual({ menuTitle: 'First' });
    expect(after.layout.params).toEqual({ menuTitle: 'Second' });
    expect(items.map((item) => item.id)).toEqual(['list-row', 'label-row']);
    expect(segments(items[0])).toEqual(pageSegments(1));
    expect(text(items[1])).toBe('Label B');
  });

  test('row from a readable list activates its id', () => {
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
    const { heading, rows, label, mixed } = mixedPages();

    // act
    const subscriptions = sourceSubscriptions(mixed);

    // assert
    expect(subscriptions).toEqual([heading, label, rows]);
  });

  // A callable object with get and subscribe looks like both kinds; only the mark counts.
  const both = Object.assign(() => 'Called', { get: () => 'Got', subscribe: () => () => {} });

  test.each([
    ['unmarked callable is called and not subscribed', both, 'Called', []],
    ['marked callable is read with get and subscribed', readable(both), 'Got', [both]]
  ])('%s', (_, pageText, title, subscribed) => {
    // arrange
    const registry = { ...sources, slot: { ...sources.slot, pageText } };
    const pages = createPages<PageView>({
      layout: 'plain',
      slots: { heading: { from: 'pageText' } },
      menu: { id: 'pages' }
    });

    // act
    const view = renderActiveView(pages.snapshot, registry, layouts, { activate: pages.send });

    // assert
    expect(view._unsafeUnwrap().layout.params).toEqual({ menuTitle: title });
    expect(sourceSubscriptions(registry)).toEqual(subscribed);
  });

  test('an unmarked object with subscribe is not subscribed', () => {
    // arrange
    const registry = { slot: {}, menu: { odd: { subscribe: true } } };

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
      'readable slot',
      { ...sources, slot: { ...sources.slot, pageText: readable(throwing) } },
      { menu: { id: 'pages' }, slots: { heading: { from: 'pageText' } } }
    ],
    [
      'readable list',
      { ...sources, menu: { pages: readable(throwing) } },
      { menu: { id: 'pages', from: 'pages' } }
    ],
    [
      'builder',
      {
        ...sources,
        menuItem: {
          ...sources.menuItem,
          badge: rowBuilder({ params: { page: slot<number>() }, build: throwing.get })
        }
      },
      { menu: { id: 'pages', items: [{ id: 'row', build: 'badge', params: { page: 1 } }] } }
    ]
  ] as const)('%s that throws gives the read error', (_, registry, view) => {
    // arrange
    const pages = createPages<PageView>({ layout: 'plain', ...view });

    // act
    const result = renderActiveView(pages.snapshot, registry, layouts, { activate: pages.send });

    // assert
    expect(result._unsafeUnwrapErr()).toBe('Expected each source to read without an error');
  });

  test('a name that is not enumerable is neither read nor subscribed', () => {
    // arrange
    const slot = {};
    Object.defineProperty(slot, 'pageText', { value: readable(cell('Hidden')), enumerable: false });
    const registry = { ...sources, slot } as typeof sources;
    const pages = createPages<PageView>({
      layout: 'plain',
      slots: { heading: { from: 'pageText' } },
      menu: { id: 'pages' }
    });

    // act
    const result = renderActiveView(pages.snapshot, registry, layouts, { activate: pages.send });

    // assert
    expect(result._unsafeUnwrapErr()).toBe('Expected a source for each name');
    expect(sourceSubscriptions(registry)).toEqual([]);
  });

  test('a mark around a source with no get or subscribe is not subscribed', () => {
    // arrange
    const registry = {
      slot: { unused: readable({} as never) },
      menu: { fake: { kind: 'readable' } }
    };

    // act
    const subscriptions = sourceSubscriptions(registry);

    // assert
    expect(subscriptions).toEqual([]);
  });
});

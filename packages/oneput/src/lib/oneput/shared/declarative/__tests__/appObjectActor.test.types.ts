import type { Controller } from '../../../controllers/controller.js';
import type { AppLayoutParams, UILayout } from '../../../types.js';
import { appObjectActor } from '../appObjectActor.js';
import { slot, viewLayout } from '../interpreter.js';
import { standardRow } from '../standardRow.js';

declare const ctl: Controller;
declare function component(ctl: Controller, params: AppLayoutParams): UILayout;

const layouts = {
  plain: viewLayout({
    slots: { heading: slot<string>() },
    create: component,
    params: ({ heading }) => ({ menuTitle: heading })
  })
};

type Context = { query: string };

/** An actor whose one state shows `view`, with the view's type inferred from its literal, as a machine's meta is. */
function actorOf<const View>(view: View) {
  const snapshot = {
    context: { query: '' } as Context,
    machine: { getStateNodeById: () => ({ path: [] }) },
    getMeta: () => ({ root: { view } }),
    can: () => false
  };
  return {
    start() {},
    stop() {},
    send(_event: { type: string }) {},
    getSnapshot: () => snapshot,
    subscribe: () => ({ unsubscribe() {} })
  };
}

const sources = {
  slot: { query: ({ context }: { context: Context }) => context.query },
  menu: {},
  menuItem: { default: standardRow }
};

// Each mention is checked against the argument that decides it.
appObjectActor(
  ctl,
  actorOf({
    layout: 'plain',
    slots: { heading: { $from: 'query' } },
    menu: { id: 'menu', items: [{ id: 'row', params: { text: 'Row' } }] }
  }),
  sources,
  layouts
);

// `sources` decides the slot source types.
appObjectActor(
  ctl,
  // @ts-expect-error 'heading' takes text, not a boolean.
  actorOf({ layout: 'plain', slots: { heading: true }, menu: { id: 'menu' } }),
  sources,
  layouts
);

// `sources` decides the row builders.
appObjectActor(
  ctl,
  // @ts-expect-error 'gone' is not a registered builder.
  actorOf({ layout: 'plain', menu: { id: 'menu', items: [{ id: 'row', build: 'gone' }] } }),
  sources,
  layouts
);

// `layouts` decides the layouts.
appObjectActor(
  ctl,
  // @ts-expect-error 'gone' is not a registered layout.
  actorOf({ layout: 'gone', menu: { id: 'menu' } }),
  sources,
  layouts
);

// `actor` decides the snapshot that the sources read.
appObjectActor(
  ctl,
  actorOf({ layout: 'plain', menu: { id: 'menu' } }),
  {
    ...sources,
    slot: {
      // @ts-expect-error The machine's context has no 'missing' field.
      missing: ({ context }) => context.missing
    }
  },
  layouts
);

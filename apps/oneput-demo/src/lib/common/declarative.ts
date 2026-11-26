/**
 * Connect this demo's declarative machines to Oneput. A view in a machine's
 * `meta` can name only the layouts in {@link viewLayouts}.
 */
import type { Controller } from '@oneput/oneput';
import { attachAppObjectActor } from '@oneput/oneput/shared/declarative/appObjectActor.js';
import type {
  DeclaredSlots,
  LayoutSlots,
  RowBuilders,
  RowParams,
  ViewFor,
  ViewSnapshot,
  ViewSources
} from '@oneput/oneput/shared/declarative/interpreter.js';
import type { OneputEvent } from '@oneput/oneput/shared/declarative/oneputEvents.js';
import { infoRow, standardRow } from '@oneput/oneput/shared/declarative/standardRow.js';
import { fromChild, type StateValue } from '@oneput/oneput/shared/routing/xstate/routeMachine.js';
import type { ActorLogic, ActorRef, Snapshot as ActorSnapshot } from 'xstate';
import { viewLayouts } from './layout.js';

type Layouts = typeof viewLayouts;

/** The content for a machine that shows only fixed rows: no slot or menu sources. */
const defaultContent = {
  slot: {},
  menu: {},
  menuItem: { default: standardRow, info: infoRow }
};

/** The view type for a machine that uses {@link defaultContent}. */
export type DefaultView<RowEvent extends { type: string } = never> = ViewFor<
  typeof defaultContent,
  Layouts,
  RowEvent
>;

/** What the AppObject reads from a snapshot of the machine. */
type AppSnapshot<
  Source,
  List extends string,
  Event extends { type: string },
  Builders extends RowBuilders
> = ActorSnapshot<unknown> &
  ViewSnapshot<Source, List, Event, RowParams<Builders>, LayoutSlots<Layouts>> & {
    value: StateValue;
    can(event: OneputEvent | Event): boolean;
  };

/**
 * A machine with the content that draws its views (`ROUTED_DECL`). The parent
 * machine invokes `machine`, and `fromChild` shows the invoked actor.
 * The types reject a view that does not fit the content or the layouts.
 */
export function declarativeAppWith<
  Machine,
  Source,
  List extends string,
  Event extends { type: string },
  Builders extends RowBuilders,
  Snapshot extends AppSnapshot<Source, List, Event, Builders>
>(
  // `DeclaredSlots` must be here: TypeScript does not check it again for each
  // machine at the `attachAppObjectActor` call below.
  machine: Machine &
    ActorLogic<Snapshot, OneputEvent | Event> &
    DeclaredSlots<NoInfer<Snapshot>, Layouts>,
  content: ViewSources<NoInfer<Snapshot>, Source, List, NoInfer<Event>, Builders>
) {
  type Actor = ActorRef<Snapshot, OneputEvent | Event>;
  return {
    machine,
    /** The `routeMachine` entry for the actor that the parent invokes as `id`. */
    fromChild: (ctl: Controller, id: string) =>
      fromChild(id, (_, child: Actor) => attachAppObjectActor(ctl, child, content, viewLayouts))
  };
}

/** {@link declarativeAppWith} for a machine that uses {@link defaultContent}. */
export function declarativeApp<
  Machine,
  Event extends { type: string },
  Snapshot extends AppSnapshot<Record<never, never>, never, Event, typeof defaultContent.menuItem>
>(
  machine: Machine &
    ActorLogic<Snapshot, OneputEvent | Event> &
    DeclaredSlots<NoInfer<Snapshot>, Layouts>
) {
  return declarativeAppWith(machine, defaultContent);
}

import type { Controller } from '../../../controllers/controller.js';
import type { AppObject } from '../../../types.js';
import { routeApp } from '../routeApp.js';

/**
 * An XState state value, declared here so that Oneput does not depend on
 * XState: a state name, or an object from parent state to child state value
 * (for example { form: 'editing' }).
 */
export type StateValue = string | { [state: string]: StateValue | undefined };

/**
 * The part of an XState snapshot that routeMachine reads: the state value,
 * the status (`done` once the machine reached a final state), and the
 * invoked children by invoke id.
 */
export type MachineSnapshot = {
  value: StateValue;
  status?: string;
  children?: { [id: string]: unknown };
};

/**
 * The part of an XState actor that routeMachine uses. Any XState actor fits
 * it, so Oneput needs no import from XState.
 */
export type MachineActor<S extends MachineSnapshot> = {
  getSnapshot(): S;
  subscribe(onChange: () => void): { unsubscribe(): void };
};

/**
 * Makes the AppObject for a state. It gets the snapshot of the actor whose
 * state it is (the parent, or the child under {@link fromChild}), and that
 * actor, so an AppObject in a child machine can send to the child.
 */
export type MakeApp<S, A = unknown> = (snapshot: S, actor: A) => AppObject;

/**
 * A map from state name to AppObject, in the shape of the machine.
 *
 * Each entry is one of three things:
 * - a function: show this AppObject for the state and all of its children;
 * - a map: the state has children; look up the child state in it;
 * - {@link fromChild}: the state invokes a child machine; route on the
 *   child's state with a map, or show one AppObject for the child.
 */
export type AppMap<S, A = unknown> = { [state: string]: MakeApp<S, A> | AppMap<S, A> | ChildRoute };

/**
 * A map entry for a state that invokes a child machine: either an
 * {@link AppMap} to route on the child's state, or a {@link MakeApp} to show
 * one AppObject for the child across its internal states. `id` is the invoke
 * id, the key of the child in the parent's `snapshot.children`.
 */
export class ChildRoute {
  constructor(
    readonly id: string,
    readonly target: AppMap<never, never> | MakeApp<never, never>
  ) {}
}

/**
 * Route to the child machine that the state invokes as `id`, while the parent
 * is in that state. Pass an {@link AppMap} to route on the child's state, or a
 * {@link MakeApp} to show one AppObject for the child across all of its
 * internal states. The AppObject gets the child's snapshot and actor.
 */
export function fromChild<A extends MachineActor<MachineSnapshot>>(
  id: string,
  target: AppMap<ReturnType<A['getSnapshot']>, A> | MakeApp<ReturnType<A['getSnapshot']>, A>
): ChildRoute {
  return new ChildRoute(id, target as AppMap<never, never> | MakeApp<never, never>);
}

/** The entry found for a state value, and the path of state names to it. */
export type Found<S, A = unknown> =
  | { path: string; make: MakeApp<S, A> }
  | { path: string; child: ChildRoute };

/**
 * Walk the state value and the map together, one level at a time, until an
 * entry is a function or a {@link fromChild}. The path (for example
 * 'form.confirm') is part of the key: routeApp replaces the AppObject only
 * when it changes.
 *
 * Throws for parallel states (more than one active child) and for a state
 * that the map does not have.
 */
export function findApp<S, A = unknown>(
  value: StateValue,
  apps: AppMap<S, A>,
  path: string[] = []
): Found<S, A> {
  // value = 'welcome', or { form: 'editing' }
  const [name, child] = typeof value === 'string' ? [value, undefined] : oneChild(value, path);
  const entry = apps[name];
  const at = [...path, name];
  if (entry === undefined)
    throw new Error(`routeMachine: no AppObject for state '${at.join('.')}'`);
  if (typeof entry === 'function') return { path: at.join('.'), make: entry };
  if (entry instanceof ChildRoute) return { path: at.join('.'), child: entry };
  if (child === undefined) {
    throw new Error(`routeMachine: state '${at.join('.')}' has a map but no child state`);
  }
  return findApp(child, entry, at);
}

function oneChild(value: { [name: string]: StateValue | undefined }, path: string[]) {
  const entries = Object.entries(value);
  if (entries.length !== 1) {
    const at = path.length ? path.join('.') : 'the root';
    throw new Error(`routeMachine: parallel states under ${at} are not supported`);
  }
  return entries[0];
}

/**
 * Where an actor's state routes to: the key, how to make its AppObject, and
 * the actors on the way (the parent, then each followed child).
 */
export type Route = { key: string; make: () => AppObject; actors: MachineActor<MachineSnapshot>[] };

const actorIds = new WeakMap<object, number>();
let nextActorId = 0;

/** Stable per-instance ID so a respawned child (for example `reenter: true`) gets a new route key. */
function actorId(actor: object) {
  let id = actorIds.get(actor);
  if (id === undefined) {
    id = ++nextActorId;
    actorIds.set(actor, id);
  }
  return id;
}

/**
 * Resolve the route of `actor` with `apps`, following {@link fromChild}
 * entries into the invoked children. The key joins the paths with '/' and tags
 * each invoked child with its instance ID, for example
 * 'home.setup/setup#1:keyForm.providers' for a child map, or
 * 'home.search/search#1' for a single child AppObject.
 *
 * Returns undefined while the route is not settled: a followed child is
 * missing, or is done and its parent has not moved on yet.
 */
export function resolveRoute(
  actor: MachineActor<MachineSnapshot>,
  apps: AppMap<never, never>
): Route | undefined {
  const snapshot = actor.getSnapshot();
  if (snapshot.status === 'done') return undefined;
  const found = findApp(snapshot.value, apps);
  if ('make' in found) {
    return {
      key: found.path,
      make: () => (found.make as MakeApp<MachineSnapshot, unknown>)(snapshot, actor),
      actors: [actor]
    };
  }
  const child = snapshot.children?.[found.child.id] as MachineActor<MachineSnapshot> | undefined;
  if (!child) return undefined;
  const childSegment = `${found.child.id}#${actorId(child)}`;
  if (typeof found.child.target === 'function') {
    const childSnapshot = child.getSnapshot();
    if (childSnapshot.status === 'done') return undefined;
    const make = found.child.target as MakeApp<MachineSnapshot, unknown>;
    return {
      key: `${found.path}/${childSegment}`,
      make: () => make(childSnapshot, child),
      actors: [actor, child]
    };
  }
  const inner = resolveRoute(child, found.child.target);
  if (!inner) return undefined;
  return {
    key: `${found.path}/${childSegment}:${inner.key}`,
    make: inner.make,
    actors: [actor, ...inner.actors]
  };
}

/**
 * ROUTED_MODE for an XState actor: show the AppObject from `apps` for the
 * actor's current state. A thin layer over routeApp.
 *
 * While the actor is in a state mapped with {@link fromChild}, it routes on
 * the invoked child, and it subscribes to the child as well as the parent.
 * A route that is not settled (see {@link resolveRoute}) keeps the AppObject
 * that is shown.
 */
export function routeMachine<A extends MachineActor<MachineSnapshot>>(
  ctl: Controller,
  actor: A,
  apps: AppMap<ReturnType<A['getSnapshot']>, A>
) {
  const root = actor as MachineActor<MachineSnapshot>;
  const map = apps as AppMap<never, never>;
  const first = resolveRoute(root, map);
  if (!first) throw new Error('routeMachine: the route is not settled at the start');
  let current = first;
  const get = () => {
    current = resolveRoute(root, map) ?? current;
    return current;
  };
  return routeApp<Route, string>(
    ctl,
    {
      get,
      subscribe: (onChange) => followActors(root, get, onChange)
    },
    (route) => route.make(),
    (route) => route.key
  );
}

/**
 * Subscribe to the actors on the current route, and follow the route as it
 * changes: a child that the route enters is subscribed, and one that it
 * leaves is unsubscribed. Returns a function that unsubscribes from all.
 */
function followActors(
  root: MachineActor<MachineSnapshot>,
  route: () => Route,
  onChange: () => void
) {
  const followed = new Map<MachineActor<MachineSnapshot>, { unsubscribe(): void }>();
  const follow = () => {
    const actors = new Set([root, ...route().actors]);
    for (const [actor, subscription] of followed) {
      if (actors.has(actor)) continue;
      subscription.unsubscribe();
      followed.delete(actor);
    }
    for (const actor of actors) {
      if (!followed.has(actor)) followed.set(actor, actor.subscribe(changed));
    }
  };
  const changed = () => {
    follow();
    onChange();
  };
  follow();
  return () => {
    for (const subscription of followed.values()) subscription.unsubscribe();
    followed.clear();
  };
}

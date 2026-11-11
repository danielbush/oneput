import type { Controller } from '../../../controllers/controller.js';
import type { AppObject } from '../../../types.js';
import { routeApp } from '../routeApp.js';

/**
 * An XState state value, declared here so that Oneput does not depend on
 * XState: a state name, or an object from parent state to child state value
 * (for example { form: 'editing' }).
 */
export type StateValue = string | { [state: string]: StateValue | undefined };

/** The part of an XState snapshot that routeMachine reads. */
export type MachineSnapshot = { value: StateValue };

/**
 * Makes the AppObject for a state. It gets the snapshot, so it can pass
 * `snapshot.context` to the AppObject.
 */
export type MakeApp<S> = (snapshot: S) => AppObject;

/**
 * A map from state name to AppObject, in the shape of the machine.
 *
 * Each entry is one of two things:
 * - a function: show this AppObject for the state and all of its children;
 * - a map: the state has children; look up the child state in it.
 */
export type AppMap<S> = { [state: string]: MakeApp<S> | AppMap<S> };

/** The entry found for a state value, and the path of state names to it. */
export type Found<S> = { path: string; make: MakeApp<S> };

/**
 * Walk the state value and the map together, one level at a time, until an
 * entry is a function. The path (for example 'form.confirm') is the key:
 * routeApp replaces the AppObject only when it changes.
 *
 * Throws for parallel states (more than one active child) and for a state
 * that the map does not have.
 */
export function findApp<S>(value: StateValue, apps: AppMap<S>, path: string[] = []): Found<S> {
  // value = 'welcome', or { form: 'editing' }
  const [name, child] = typeof value === 'string' ? [value, undefined] : oneChild(value, path);
  const entry = apps[name];
  const at = [...path, name];
  if (entry === undefined)
    throw new Error(`routeMachine: no AppObject for state '${at.join('.')}'`);
  if (typeof entry === 'function') return { path: at.join('.'), make: entry };
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
 * The part of an XState actor that routeMachine uses. Any XState actor fits
 * it, so Oneput needs no import from XState.
 */
export type MachineActor<S extends MachineSnapshot> = {
  getSnapshot(): S;
  subscribe(onChange: () => void): { unsubscribe(): void };
};

/**
 * ROUTED_MODE for an XState actor: show the AppObject from `apps` for the
 * actor's current state. A thin layer over routeApp.
 */
export function routeMachine<S extends MachineSnapshot>(
  ctl: Controller,
  actor: MachineActor<S>,
  apps: AppMap<S>
) {
  return routeApp<S, string>(
    ctl,
    {
      get: () => actor.getSnapshot(),
      subscribe: (onChange) => {
        const subscription = actor.subscribe(onChange);
        return () => subscription.unsubscribe();
      }
    },
    (snapshot) => findApp(snapshot.value, apps).make(snapshot),
    (snapshot) => findApp(snapshot.value, apps).path
  );
}

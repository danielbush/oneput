import { describe, expect, it } from 'vitest';
import { findApp, type AppMap } from './routeMachine.js';

// Each entry returns its own name instead of an AppObject, so the tests can
// see which entry was found.
const make = (name: string) => () => name as never;

const apps: AppMap<unknown> = {
  welcome: make('welcome'),
  form: { editing: make('form.editing'), confirm: make('form.confirm') },
  done: make('done')
};

describe('findApp', () => {
  it('finds a top-level state', () => {
    const found = findApp('welcome', apps);
    expect(found.path).toBe('welcome');
    expect(found.make(undefined)).toBe('welcome');
  });

  it('walks into a child state when the entry is a map', () => {
    const found = findApp({ form: 'confirm' }, apps);
    expect(found.path).toBe('form.confirm');
    expect(found.make(undefined)).toBe('form.confirm');
  });

  it('stops at a function, so one AppObject covers all children', () => {
    const found = findApp({ form: 'confirm' }, { form: make('form') });
    expect(found.path).toBe('form');
  });

  it('walks several levels', () => {
    const deep: AppMap<unknown> = { form: { editing: { email: make('email') } } };
    expect(findApp({ form: { editing: 'email' } }, deep).path).toBe('form.editing.email');
  });

  it('throws for a state that the map does not have', () => {
    expect(() => findApp({ form: 'review' }, apps)).toThrow("no AppObject for state 'form.review'");
  });

  it('throws for parallel states', () => {
    expect(() => findApp({ form: 'editing', done: undefined }, apps)).toThrow('parallel states');
  });
});

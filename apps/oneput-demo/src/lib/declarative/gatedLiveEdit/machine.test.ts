import { describe, expect, it } from 'vitest';
import { createActor, waitFor, type SnapshotFrom } from 'xstate';
import { profileActions } from './actions.js';
import { gatedLiveEdit } from './machine.js';
import { ProfileStore } from './profileStore.js';
import { sources } from './sources.js';

function activeMenu(snapshot: SnapshotFrom<typeof gatedLiveEdit>) {
  const views = Object.values(snapshot.getMeta()).flatMap((meta) =>
    meta?.view ? [meta.view] : []
  );
  const [view] = views;
  if (views.length !== 1 || !view || !('items' in view.menu)) {
    throw new Error('Expected one active view with literal menu items.');
  }
  return { title: view.title, items: view.menu.items };
}

describe('gated live edit', () => {
  it('keeps the draft through confirmation and saves on retry', async () => {
    // arrange
    const profile = { name: 'Grace Hopper', role: 'Computer scientist' };
    const store = ProfileStore.createNull({ profile, failNextSave: true });
    const actor = createActor(gatedLiveEdit.provide({ actions: profileActions(store) })).start();
    actor.send({ type: 'STARTED' });
    await waitFor(actor, (snapshot) => snapshot.matches('filtering'));
    actor.send({ type: 'ITEM_ACTIVATED', id: 'live-edit-mixed-name' });
    const typing = actor.getSnapshot();
    actor.send({ type: 'INPUT_CHANGED', value: 'Grace Murray Hopper' });

    // act
    actor.send({ type: 'ITEM_ACTIVATED', id: 'live-edit-mixed-name' });
    const failed = await waitFor(actor, (snapshot) => snapshot.matches({ editing: 'saveFailed' }));
    actor.send({ type: 'BACK' });
    const confirmation = actor.getSnapshot();
    actor.send({ type: 'ITEM_ACTIVATED', id: 'live-edit-keep-editing' });
    const kept = actor.getSnapshot();
    actor.send({ type: 'ITEM_ACTIVATED', id: 'live-edit-retry-save' });
    const retrying = actor.getSnapshot();
    const saved = await waitFor(actor, (snapshot) => snapshot.matches('filtering'));

    // assert
    expect(typing.matches({ editing: 'typing' })).toBe(true);
    expect(activeMenu(failed).items).toContainEqual(
      expect.objectContaining({
        id: 'live-edit-retry-save',
        detail: 'Could not save. Activate to retry.'
      })
    );
    expect(confirmation.matches('confirmDiscard')).toBe(true);
    const { title, items } = activeMenu(confirmation);
    expect(title).toBe('Changes not saved');
    expect(
      items.map(({ text }) =>
        typeof text === 'string' ? text : sources.text[text.from](confirmation.context)
      )
    ).toEqual(['Discard "Grace Murray Hopper"', 'Keep editing']);
    expect(kept.matches({ editing: 'saveFailed' })).toBe(true);
    expect(kept.context.draft?.value).toBe('Grace Murray Hopper');
    expect(retrying.matches('saving')).toBe(true);
    expect(sources.text.nameLabel(saved.context)).toBe('Name: Grace Murray Hopper');
    expect((await store.load())._unsafeUnwrap().name).toBe('Grace Murray Hopper');
    actor.stop();
  });

  it('returns to the last saved value after discard', async () => {
    // arrange
    const profile = { name: 'Grace Hopper', role: 'Computer scientist' };
    const store = ProfileStore.createNull({ profile, failNextSave: true });
    const actor = createActor(gatedLiveEdit.provide({ actions: profileActions(store) })).start();
    actor.send({ type: 'STARTED' });
    await waitFor(actor, (snapshot) => snapshot.matches('filtering'));
    actor.send({ type: 'ITEM_ACTIVATED', id: 'live-edit-mixed-role' });
    actor.send({ type: 'INPUT_CHANGED', value: 'Rear admiral' });
    actor.send({ type: 'BACK' });
    await waitFor(actor, (snapshot) => snapshot.matches({ editing: 'saveFailed' }));

    // act
    actor.send({
      type: 'ITEM_FOCUSED',
      menuId: 'live-edit-mixed-menu',
      index: -1,
      cause: 'keyboard'
    });
    const unfocused = actor.getSnapshot();
    actor.send({ type: 'BACK' });
    actor.send({ type: 'BACK' });
    const returned = actor.getSnapshot();
    actor.send({ type: 'BACK' });
    actor.send({ type: 'ITEM_ACTIVATED', id: 'live-edit-discard' });
    const discarded = actor.getSnapshot();

    // assert
    expect(unfocused.matches({ editing: 'saveFailed' })).toBe(true);
    expect(returned.matches({ editing: 'saveFailed' })).toBe(true);
    expect(returned.context.draft?.value).toBe('Rear admiral');
    expect(discarded.matches('filtering')).toBe(true);
    expect(discarded.context.draft).toBeNull();
    expect(sources.text.roleLabel(discarded.context)).toBe('Role: Computer scientist');
    expect((await store.load())._unsafeUnwrap()).toEqual(profile);
    actor.stop();
  });
});

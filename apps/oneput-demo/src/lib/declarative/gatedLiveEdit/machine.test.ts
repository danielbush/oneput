// @vitest-environment jsdom
import { Controller, type FlexChildren } from '@oneput/oneput';
import { describe, expect, it } from 'vitest';
import { createActor, waitFor, type SnapshotFrom } from 'xstate';
import { appObjectActor } from '../appObjectActor.js';
import { renderActiveView } from '../interpreter.js';
import { profileActions } from './actions.js';
import { gatedLiveEdit } from './machine.js';
import { ProfileStore } from './profileStore.js';
import { sources } from './sources.js';

type EditActor = ReturnType<typeof createActor<typeof gatedLiveEdit>>;
type EditSnapshot = SnapshotFrom<typeof gatedLiveEdit>;

function renderEditor(actor: EditActor, snapshot: EditSnapshot) {
  return renderActiveView(Controller.createNull(), snapshot, () => snapshot.context, sources, {
    activate: (event) => actor.send(event),
    change: (value) => actor.send({ type: 'INPUT_CHANGED', value }),
    release: (id, reason) => actor.send({ type: 'INPUT_RELEASED', id, reason })
  })._unsafeUnwrap();
}

function rowContent(children: FlexChildren = []): string[] {
  return children.flatMap((child) =>
    !child
      ? []
      : child.type === 'fchild'
        ? [child.icon ?? child.textContent ?? ''].filter(Boolean)
        : rowContent(child.children)
  );
}

describe('gated live-edit form', () => {
  it('saves the active field edit and disables Save', async () => {
    // arrange
    const profile = { name: 'Grace Hopper', role: 'Computer scientist' };
    const store = ProfileStore.createNull({ profile });
    const actor = createActor(gatedLiveEdit.provide({ actions: profileActions(store) })).start();
    actor.send({ type: 'STARTED' });
    await waitFor(actor, (snapshot) => snapshot.matches({ ready: 'filtering' }));

    // act
    const name = renderEditor(actor, actor.getSnapshot()).menu.items[0];
    if (!name || !name.action) throw new Error('Expected Name to be editable.');
    name.action(Controller.createNull());
    actor.send({ type: 'INPUT_CHANGED', value: 'Ada' });
    const edited = actor.getSnapshot();
    const save = renderEditor(actor, edited).menu.items[3];
    if (!save || !save.action) throw new Error('Expected Save to be enabled.');
    save.action(Controller.createNull());
    const saved = await waitFor(actor, (snapshot) => snapshot.matches({ ready: 'filtering' }));

    // assert
    const draft = { ...profile, name: 'Ada' };
    expect(edited.matches({ ready: 'editing' })).toBe(true);
    expect(edited.context.draft).toEqual(profile);
    expect(renderEditor(actor, edited).menu.items[3]).toHaveProperty(
      'action',
      expect.any(Function)
    );
    expect(saved.context.profile).toEqual(draft);
    expect((await store.load())._unsafeUnwrap()).toEqual(draft);
    expect(renderEditor(actor, saved).menu.items[3]).not.toHaveProperty(
      'action',
      expect.any(Function)
    );
    actor.stop();
  });

  it('keeps the whole draft on a failed save and saves it on retry', async () => {
    // arrange
    const profile = { name: 'Grace Hopper', role: 'Computer scientist' };
    const store = ProfileStore.createNull({ profile, failNextSave: true });
    const actor = createActor(gatedLiveEdit.provide({ actions: profileActions(store) })).start();
    actor.send({ type: 'STARTED' });
    const clean = await waitFor(actor, (snapshot) => snapshot.matches({ ready: 'filtering' }));
    actor.send({ type: 'EDIT_FIELD', field: 'role' });
    actor.send({ type: 'INPUT_CHANGED', value: 'Rear admiral' });
    actor.send({
      type: 'ITEM_FOCUSED',
      menuId: 'live-edit-mixed-menu',
      id: 'live-edit-mixed-name',
      index: 0,
      cause: 'keyboard'
    });
    actor.send({ type: 'EDIT_FIELD', field: 'name' });
    actor.send({ type: 'INPUT_CHANGED', value: 'Ada' });
    actor.send({ type: 'EDIT_FIELD', field: 'name' });
    const dirty = actor.getSnapshot();
    const storeBeforeSave = (await store.load())._unsafeUnwrap();
    const previewMessages: string[] = [];
    actor.on('preview', ({ message }) => previewMessages.push(message));

    // act
    actor.send({ type: 'PREVIEW' });
    actor.send({ type: 'SAVE' });
    const saving = actor.getSnapshot();
    const failed = await waitFor(actor, (snapshot) => snapshot.matches({ ready: 'saveFailed' }));
    const storeAfterFailure = (await store.load())._unsafeUnwrap();
    actor.send({ type: 'BACK' });
    actor.send({ type: 'KEEP_EDITING' });
    const kept = actor.getSnapshot();
    actor.send({ type: 'SAVE' });
    const saved = await waitFor(actor, (snapshot) => snapshot.matches({ ready: 'filtering' }));

    // assert
    const cleanView = renderEditor(actor, clean);
    const dirtyView = renderEditor(actor, dirty);
    const savingView = renderEditor(actor, saving);
    const failedView = renderEditor(actor, failed);
    const savedView = renderEditor(actor, saved);
    expect(cleanView.menu.items[3]).toMatchObject({ id: 'live-edit-save', canFilter: false });
    expect(cleanView.menu.items[3]).not.toHaveProperty('action', expect.any(Function));
    expect(dirty.matches({ ready: 'filtering' })).toBe(true);
    expect(dirtyView.menu.items[3]).toHaveProperty('action', expect.any(Function));
    expect(saving.matches({ ready: 'saving' })).toBe(true);
    expect(savingView.menu.items[3]).not.toHaveProperty('action', expect.any(Function));
    expect(failedView.menu.items[3]).toHaveProperty('action', expect.any(Function));
    expect(savedView.menu.items[3]).not.toHaveProperty('action', expect.any(Function));
    expect(saved.context.draft).toEqual({ name: 'Ada', role: 'Rear admiral' });
    expect(saved.context.profile).toEqual(saved.context.draft);
    expect(previewMessages).toEqual(['Ada — Rear admiral']);
    expect(storeBeforeSave).toEqual(profile);
    expect(storeAfterFailure).toEqual(profile);
    expect((await store.load())._unsafeUnwrap()).toEqual(saved.context.draft);

    const ids = cleanView.menu.items.map((row) => row && row.id);
    for (const view of [savingView, failedView, savedView]) {
      expect(view.menu.id).toBe(cleanView.menu.id);
      expect(view.menu.items.map((row) => row && row.id)).toEqual(ids);
      expect(view.menu.focusBehaviour).toBe('none');
    }
    expect(failedView.menu.items.map((row) => rowContent(row ? row.children : undefined))).toEqual([
      ['Pencil', 'Name: Ada', 'Activate to edit this value.'],
      ['Pencil', 'Role: Rear admiral', 'Activate to edit this value.'],
      ['Preview values'],
      ['CircleAlert', 'Save', 'Could not save. Activate to retry.']
    ]);
    expect(kept.matches({ ready: 'saveFailed' })).toBe(true);
    for (const view of [savingView, failedView]) {
      expect(view.settings.enableFilter).toBe(false);
      expect(view.settings.enableInputElement).toBe(false);
      if (view.input?.kind !== 'claim') throw new Error('Expected the draft input claim.');
      expect(view.input.options.owner).toEqual({ type: 'menu-item', itemId: 'live-edit-save' });
      expect(view.input.options.value.read()).toBe('Ada');
    }
    actor.stop();
  });

  it('returns to the parent AppObject on Back when the draft matches the saved profile', async () => {
    // arrange
    const ctl = Controller.createNull();
    const parent = { onStart() {} };
    const profile = { name: 'Grace Hopper', role: 'Computer scientist' };
    const store = ProfileStore.createNull({ profile });
    const actor = createActor(gatedLiveEdit.provide({ actions: profileActions(store) }));
    const app = appObjectActor(ctl, actor, sources, () => {});
    ctl.app.run(parent);
    ctl.app.run(app);
    const loaded = await waitFor(actor, (snapshot) => snapshot.matches({ ready: 'filtering' }));

    // act
    ctl.app.goBack();

    // assert
    expect(loaded.can({ type: 'BACK' })).toBe(false);
    expect(ctl.app.isCurrent(parent)).toBe(true);
    expect(ctl.app.contains(app)).toBe(false);
  });

  it('keeps or discards unsaved changes from Back', async () => {
    // arrange
    const profile = { name: 'Grace Hopper', role: 'Computer scientist' };
    const store = ProfileStore.createNull({ profile });
    const actor = createActor(gatedLiveEdit.provide({ actions: profileActions(store) })).start();
    actor.send({ type: 'STARTED' });
    await waitFor(actor, (snapshot) => snapshot.matches({ ready: 'filtering' }));
    actor.send({ type: 'EDIT_FIELD', field: 'role' });
    actor.send({ type: 'INPUT_CHANGED', value: 'Rear admiral' });

    // act
    actor.send({ type: 'BACK' });
    const confirmation = actor.getSnapshot();
    actor.send({ type: 'BACK' });
    const kept = actor.getSnapshot();
    actor.send({ type: 'BACK' });
    actor.send({ type: 'DISCARD' });
    const discarded = actor.getSnapshot();

    // assert
    expect(confirmation.matches('confirmDiscard')).toBe(true);
    const view = renderEditor(actor, confirmation);
    expect(view.layout.menuTitle).toBe('Changes not saved');
    expect(view.menu.items.map((row) => rowContent(row ? row.children : undefined))).toEqual([
      ['Discard'],
      ['Keep editing']
    ]);
    expect(kept.matches({ ready: 'filtering' })).toBe(true);
    expect(kept.context.draft).toEqual({ ...profile, role: 'Rear admiral' });
    expect(discarded.matches({ ready: 'filtering' })).toBe(true);
    expect(discarded.context.draft).toEqual(profile);
    expect((await store.load())._unsafeUnwrap()).toEqual(profile);
    actor.stop();
  });

  it('returns to clean when an edit restores the saved value', async () => {
    // arrange
    const profile = { name: 'Grace Hopper', role: 'Computer scientist' };
    const store = ProfileStore.createNull({ profile });
    const actor = createActor(gatedLiveEdit.provide({ actions: profileActions(store) })).start();
    actor.send({ type: 'STARTED' });
    await waitFor(actor, (snapshot) => snapshot.matches({ ready: 'filtering' }));
    actor.send({ type: 'EDIT_FIELD', field: 'name' });
    actor.send({ type: 'INPUT_CHANGED', value: 'Ada' });
    actor.send({ type: 'EDIT_FIELD', field: 'name' });
    actor.send({ type: 'EDIT_FIELD', field: 'name' });

    // act
    const editingView = renderEditor(actor, actor.getSnapshot());
    if (editingView.input?.kind !== 'claim') throw new Error('Expected the editing input claim.');
    const reopenedValue = editingView.input.options.value.read();
    actor.send({ type: 'INPUT_CHANGED', value: 'Grace Hopper' });
    actor.send({ type: 'INPUT_RELEASED', id: 'live-edit-mixed-name', reason: 'submit' });
    const clean = actor.getSnapshot();

    // assert
    expect(reopenedValue).toBe('Ada');
    expect(clean.matches({ ready: 'filtering' })).toBe(true);
    expect(clean.context.draft).toEqual(profile);
    expect(renderEditor(actor, clean).menu.items[3]).not.toHaveProperty(
      'action',
      expect.any(Function)
    );
    actor.stop();
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { Controller } from '../../controllers/controller.js';
import { FocusedMenuLiveEdit } from './FocusedMenuLiveEdit.js';
import { stdMenuItem } from '../ui/menuItems/stdMenuItem.js';
import type { AppObject } from '../../types.js';

describe('FocusedMenuLiveEdit', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('claims on menu focus and hands over when focus moves', async () => {
    // arrange
    const ctl = Controller.createNull({ menuOpen: true });
    const input = ctl.currentProps.inputElement as HTMLInputElement;
    document.body.appendChild(input);

    const values = { name: 'Ada', role: 'Programmer' };
    const liveEdit = FocusedMenuLiveEdit.create(ctl);
    const app: AppObject = {
      settings: { enableFilter: false },
      menu: () => ({
        id: 'focused',
        focusBehaviour: 'first',
        items: [
          liveEdit.item({
            id: 'name',
            value: {
              read: () => values.name,
              write: (value) => {
                values.name = value;
              }
            },
            placeholder: 'Edit name...',
            render: ({ value, editing }) =>
              stdMenuItem({
                id: 'name',
                textContent: `Name: ${value}`,
                bottom: { textContent: editing ? 'Editing.' : 'Focus.' }
              })
          }),
          liveEdit.item({
            id: 'role',
            value: {
              read: () => values.role,
              write: (value) => {
                values.role = value;
              }
            },
            placeholder: 'Edit role...',
            render: ({ value }) =>
              stdMenuItem({
                id: 'role',
                textContent: `Role: ${value}`
              })
          })
        ]
      }),
      onStart: () => {}
    };

    ctl.app.run(app);
    await ctl.menu.invalidate({ focusBehaviour: 'first' });

    // assert — open/invalidate focus claims first row
    expect(liveEdit.editingItemId).toBe('name');
    expect(ctl.input.getInputValue()).toBe('Ada');
    expect(ctl.input.hasActiveClaim).toBe(true);

    // act — type into claimed field (claim selects all, so typing replaces)
    await ctl.input.typeText('Ada Lovelace');
    expect(values.name).toBe('Ada Lovelace');

    // act — keyboard focus moves to next editable row
    ctl.menu.focusNextMenuItem();

    // assert — handover
    expect(liveEdit.editingItemId).toBe('role');
    expect(ctl.input.getInputValue()).toBe('Programmer');

    // act — back releases claim
    ctl.app.goBack();
    expect(liveEdit.editingItemId).toBeUndefined();
    expect(ctl.input.hasActiveClaim).toBe(false);
  });

  it('claiming the same focused row is idempotent', async () => {
    // arrange
    const ctl = Controller.createNull({ menuOpen: true });
    const input = ctl.currentProps.inputElement as HTMLInputElement;
    document.body.appendChild(input);

    let name = 'Ada';
    const liveEdit = FocusedMenuLiveEdit.create(ctl);
    ctl.app.run({
      settings: { enableFilter: false },
      menu: () => ({
        id: 'focused',
        focusBehaviour: 'first',
        items: [
          liveEdit.item({
            id: 'name',
            value: {
              read: () => name,
              write: (value) => {
                name = value;
              }
            },
            render: ({ value }) =>
              stdMenuItem({
                id: 'name',
                textContent: value
              })
          })
        ]
      })
    });
    await ctl.menu.invalidate({ focusBehaviour: 'first' });
    expect(liveEdit.editingItemId).toBe('name');
    const claim = ctl.input.hasActiveClaim;

    // act — same row focused again (programmatic)
    ctl.menu.focusMenuItemById('name');

    // assert
    expect(liveEdit.editingItemId).toBe('name');
    expect(ctl.input.hasActiveClaim).toBe(claim);
  });
});

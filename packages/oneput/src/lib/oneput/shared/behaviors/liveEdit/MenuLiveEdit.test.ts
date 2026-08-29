import { afterEach, describe, expect, it } from 'vitest';
import { Controller } from '../../../controllers/controller.js';
import { MenuLiveEdit } from './MenuLiveEdit.js';
import { stdMenuItem } from '../../ui/menuItems/stdMenuItem.js';
import type { AppObject } from '../../../types.js';

describe('MenuLiveEdit', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('acquires a claim on activate and restores filter query on back', async () => {
    // arrange
    const ctl = Controller.createNull({ menuOpen: true });
    const input = ctl.currentProps.inputElement as HTMLInputElement;
    document.body.appendChild(input);

    let title = 'Ada';
    const liveEdit = MenuLiveEdit.create(ctl);
    const app: AppObject = {
      settings: {
        enableFilter: true,
        clearInputAfterAction: false,
        clearInputAfterBack: false
      },
      menu: () => ({
        id: 'mixed',
        items: [
          liveEdit.item({
            id: 'node-label',
            value: {
              read: () => title,
              write: (value) => {
                title = value;
              }
            },
            placeholder: 'Edit label...',
            render: ({ value, editing }) =>
              stdMenuItem({
                id: 'node-label',
                textContent: `Label: ${value}`,
                bottom: { textContent: editing ? 'Editing.' : 'Activate.' }
              })
          })
        ]
      }),
      onStart: () => {
        ctl.input.setPlaceholder('Filter...');
      }
    };

    ctl.app.run(app);
    await ctl.input.setInputValue('lab');
    expect(ctl.menu.enableFilter).toBe(true);

    // act — activate editable row
    const item = ctl.menu.baseMenuItems[0];
    if (!item || !('action' in item) || !item.action) {
      throw new Error('expected live-edit menu item');
    }
    item.action(ctl);
    await ctl.input.typeText(' Lovelace');

    // assert — claimed
    expect(liveEdit.editingItemId).toBe('node-label');
    expect(title).toBe('Ada Lovelace');
    expect(ctl.menu.enableFilter).toBe(false);

    // act — back releases claim (claim policy, before AppObject navigation)
    ctl.app.goBack();

    // assert — filter restored
    expect(liveEdit.editingItemId).toBeUndefined();
    expect(ctl.input.getInputValue()).toBe('lab');
    expect(ctl.menu.enableFilter).toBe(true);
  });

  it('releases the claim when the AppObject input scope closes', async () => {
    // arrange
    const ctl = Controller.createNull({ menuOpen: true });
    const input = ctl.currentProps.inputElement as HTMLInputElement;
    document.body.appendChild(input);

    const liveEdit = MenuLiveEdit.create(ctl);
    const row = liveEdit.item({
      id: 'node-label',
      value: {
        read: () => 'Ada',
        write: () => {}
      },
      render: ({ value }) =>
        stdMenuItem({
          id: 'node-label',
          textContent: value
        })
    });
    ctl.app.run({
      settings: { clearInputAfterAction: false },
      menu: () => ({
        id: 'mixed',
        items: [row]
      })
    });
    await ctl.menu.invalidate();

    row.action?.(ctl);
    expect(liveEdit.editing).toBe(true);
    expect(ctl.input.hasActiveClaim).toBe(true);

    // act — leave the AppObject (closes input scope)
    ctl.app.run({ onStart: () => {} });

    // assert
    expect(liveEdit.editing).toBe(false);
    expect(ctl.input.hasActiveClaim).toBe(false);
  });
});

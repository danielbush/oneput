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

  describe('a filtered menu', () => {
    /** Rows `label`, `role` and `notes`; `role` can be edited. The filter matches ids. */
    async function setup() {
      const ctl = Controller.createNull({ menuOpen: true });
      const input = ctl.currentProps.inputElement as HTMLInputElement;
      document.body.appendChild(input);
      let role = 'Admin';
      const liveEdit = MenuLiveEdit.create(ctl);
      ctl.app.run({
        settings: { enableFilter: true, clearInputAfterAction: false, clearInputAfterBack: false },
        menu: () => ({
          id: 'mixed',
          items: [
            stdMenuItem({ id: 'label', textContent: 'Label' }),
            liveEdit.item({
              id: 'role',
              value: {
                read: () => role,
                write: (value) => {
                  role = value;
                }
              },
              render: ({ value }) => stdMenuItem({ id: 'role', textContent: `Role: ${value}` })
            }),
            stdMenuItem({ id: 'notes', textContent: 'Notes' })
          ]
        })
      });
      ctl.menu.setFilter((query, items) => ({
        items: items.filter((item) => item.id.includes(query))
      }));
      await ctl.input.setInputValue('ro');
      const rows = () => (ctl.currentProps.menuItems ?? []).map((item) => item.id);
      /** The id of the row that has menu focus. */
      const focused = () => rows()[ctl.currentProps.menuItemFocus?.[0] ?? -1];
      const activateRole = async () => {
        const item = ctl.menu.baseMenuItems.find((i) => i.id === 'role');
        if (!item || !('action' in item) || !item.action) throw new Error('no role row');
        item.action(ctl);
        await ctl.menu.invalidate();
      };
      return { ctl, rows, focused, activateRole, role: () => role };
    }

    it('editing keeps the filtered rows; the input shows the value', async () => {
      // arrange
      const { ctl, rows, activateRole, role } = await setup();
      expect(rows()).toEqual(['role']);

      // act
      await activateRole();

      // assert
      expect(ctl.input.getInputValue()).toBe('Admin');
      expect(rows()).toEqual(['role']);

      // act — the value is selected, thus typing replaces it
      await ctl.input.typeText('Owner');
      await ctl.menu.invalidate();

      // assert
      expect(role()).toBe('Owner');
      expect(rows()).toEqual(['role']);
    });

    it('activating the row again submits: the input clears and all rows show', async () => {
      // arrange
      const { ctl, rows, focused, activateRole } = await setup();
      await activateRole();

      // act
      await activateRole();

      // assert
      expect(ctl.input.hasActiveClaim).toBe(false);
      expect(ctl.input.getInputValue()).toBe('');
      expect(rows()).toEqual(['label', 'role', 'notes']);
      expect(focused()).toBe('role');
    });

    it('Back ends the edit: the filter text and its rows come back', async () => {
      // arrange
      const { ctl, rows, focused, activateRole } = await setup();
      await activateRole();

      // act
      ctl.app.goBack();
      await ctl.menu.invalidate();

      // assert
      expect(ctl.input.getInputValue()).toBe('ro');
      expect(rows()).toEqual(['role']);
      expect(focused()).toBe('role');
    });
  });
});

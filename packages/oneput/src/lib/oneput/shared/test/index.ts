import type { Controller } from '../../controllers/controller.js';

/** Wait for the next menu-items event with the expected menu ID. */
export function assertMenuId(ctl: Controller, expectedMenuId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Menu "${expectedMenuId}" did not publish its items`));
    }, 1000);
    const unsubscribe = ctl.events.on('set-menu-items', ({ menuId }) => {
      if (menuId !== expectedMenuId) return;
      clearTimeout(timeout);
      unsubscribe();
      resolve();
    });
  });
}

import { describe, it, expect } from 'vitest';
import { Controller } from './controller.js';

function createNull(props: Parameters<typeof Controller.createNull>[0] = {}) {
  return Controller.createNull(props);
}

describe('Controller', () => {
  describe('createNull', () => {
    it('tracks app changes without spying', () => {
      // arrange
      const ctl = createNull();
      const appChanges = ctl.trackAppChanges();
      const appObject = {
        onStart: () => {}
      };

      // act
      ctl.app.run(appObject);

      // assert
      expect(appChanges.data).toEqual([{ previous: null, current: appObject }]);
    });

    it('emits app-change events', () => {
      // arrange
      const ctl = createNull();
      const events: { previous: object | null; current: object | null }[] = [];
      const appObject = {
        onStart: () => {}
      };
      ctl.events.on('app-change', (payload) => {
        events.push(payload as { previous: object | null; current: object | null });
      });

      // act
      ctl.app.run(appObject);

      // assert
      expect(events).toEqual([{ previous: null, current: appObject }]);
    });
  });

  describe('notify', () => {
    it('injects notification UI into currentProps', () => {
      // arrange
      const ctl = createNull();

      // act
      ctl.notify('hello world');

      // assert
      expect(ctl.currentProps.injectUI).toBeDefined();
    });
  });

  describe('clearNotifications', () => {
    it('clears injected notification UI from currentProps', () => {
      // arrange
      const ctl = createNull();
      ctl.notify('hello world');

      // act
      ctl.clearNotifications();

      // assert
      expect(ctl.currentProps.injectUI).toBeUndefined();
    });
  });

  describe('toggleHide', () => {
    it('dispatches oneput-toggle-hide event on window', () => {
      // arrange
      const ctl = createNull();
      const events: Event[] = [];
      window.addEventListener('oneput-toggle-hide', (e) => events.push(e));

      // act
      ctl.toggleHide();

      // assert
      expect(events).toHaveLength(1);
    });
  });
});

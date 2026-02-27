import { describe, it, expect } from 'vitest';
import { Window as HappyWindow } from 'happy-dom';
import { Controller } from './controller.js';

function createNull(props: Parameters<typeof Controller.createNull>[1] = {}) {
  return Controller.createNull(new HappyWindow() as unknown as Window, props);
}

describe('Controller', () => {
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
      ctl.window.addEventListener('oneput-toggle-hide', (e) => events.push(e));

      // act
      ctl.toggleHide();

      // assert
      expect(events).toHaveLength(1);
    });
  });
});

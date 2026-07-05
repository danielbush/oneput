import { describe, expect, it } from 'vitest';
import { Controller } from './controller.js';
import type { AppObject, UILayout } from '../types.js';

function layout(id: string): UILayout {
  return {
    configure: () => {},
    innerUI: {
      id,
      type: 'vflex'
    }
  };
}

describe('AppController', () => {
  it('INHERIT_LAYOUT - restores an inherited parent layout after exiting a child with its own layout', () => {
    // arrange
    const ctl = Controller.createNull();
    const appLayout = layout('app-layout');
    const childLayout = layout('child-layout');
    const appObject: AppObject = {
      layout: () => appLayout,
      onStart: () => {}
    };
    const parent: AppObject = {
      onStart: () => {}
    };
    const child: AppObject = {
      layout: () => childLayout,
      onStart: () => {}
    };

    ctl.app.run(appObject);
    ctl.app.run(parent);
    ctl.app.run(child);

    // act
    ctl.app.exit();

    // assert
    expect(ctl.ui.getLayout()).toBe(appLayout);
  });
});

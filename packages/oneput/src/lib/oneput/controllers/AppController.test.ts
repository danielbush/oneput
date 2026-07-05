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

function trackedLayout(id: string) {
  const params: Array<Record<string, unknown> | undefined> = [];
  const appLayout: UILayout = {
    configure: ({ params: nextParams }) => {
      params.push(nextParams);
    },
    innerUI: {
      id,
      type: 'vflex'
    }
  };

  return { appLayout, params };
}

function layoutFactory(id: string) {
  const params: Array<Record<string, unknown>> = [];
  const appLayout = layout(id);

  return {
    appLayout,
    params,
    create: (_ctl: Controller, nextParams: Record<string, unknown>) => {
      params.push(nextParams);
      return appLayout;
    }
  };
}

describe('AppController', () => {
  it('INHERIT_LAYOUT - restores an inherited parent layout after exiting a child with its own layout', () => {
    // arrange
    const ctl = Controller.createNull();
    const appLayout = layoutFactory('app-layout');
    const childLayout = layoutFactory('child-layout');
    const appObject: AppObject = {
      layout: { layout: appLayout.create, params: {} },
      onStart: () => {}
    };
    const parent: AppObject = {
      onStart: () => {}
    };
    const child: AppObject = {
      layout: { layout: childLayout.create, params: {} },
      onStart: () => {}
    };

    ctl.app.run(appObject);
    ctl.app.run(parent);
    ctl.app.run(child);

    // act
    ctl.app.exit();

    // assert
    expect(ctl.ui.getLayout()).toBe(appLayout.appLayout);
  });

  it('configures an inherited layout before starting an app object', () => {
    // arrange
    const ctl = Controller.createNull();
    const { appLayout, params } = trackedLayout('app-layout');
    const appObject: AppObject = {
      layout: {
        layout: (_ctl, _params) => appLayout,
        params: {}
      },
      onStart: () => {}
    };
    const child: AppObject<unknown, { menuTitle: string }> = {
      layout: { params: { menuTitle: 'Child' } },
      onStart: () => {}
    };

    ctl.app.run(appObject);

    // act
    ctl.app.run(child);

    // assert
    expect(ctl.ui.getLayout()).toBe(appLayout);
    expect(params).toContainEqual({ menuTitle: 'Child' });
  });

  it('passes params to an installed layout factory', () => {
    // arrange
    const ctl = Controller.createNull();
    const { appLayout, params, create } = layoutFactory('app-layout');
    const appObject: AppObject<unknown, { menuTitle: string }> = {
      layout: {
        layout: create,
        params: { menuTitle: 'Home' }
      },
      onStart: () => {}
    };

    // act
    ctl.app.run(appObject);

    // assert
    expect(ctl.ui.getLayout()).toBe(appLayout);
    expect(params).toEqual([{ menuTitle: 'Home' }]);
  });
});

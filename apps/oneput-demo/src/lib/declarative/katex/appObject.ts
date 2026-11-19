import type { AppObject, Controller } from '@oneput/oneput';
import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import { createActor } from 'xstate';
import { DemoDocument } from '../../main/FormulaMarkup.js';
import { appObjectActor, type ApplyView } from '../appObjectActor.js';
import { createKatexMachine } from './machine.js';
import { sources } from './sources.js';

/** Connect the host controls to the formula actor and the shared view adapter. */
export function createKatexAppObject(
  ctl: Controller,
  applyView: ApplyView,
  doc = DemoDocument.create()
): AppObject {
  const actor = createActor(createKatexMachine(doc));
  let unsubscribeFocus: (() => void) | undefined;
  actor.on('startInput', () => {
    unsubscribeFocus = ctl.input.subscribeFocusChange((focused) => {
      if (focused && ctl.app.isCurrent(app)) ctl.menu.focusMenuItemById('katex-preview-pane');
    });
    actor.send({ type: 'INPUT_CHANGED', value: ctl.input.getInputValue() });
    ctl.input.focus();
  });
  actor.on('stopInput', () => unsubscribeFocus?.());
  actor.on('focusInput', () => ctl.input.focus());
  actor.on('blurInput', () => ctl.input.blur());
  actor.on('inserted', ({ focusInput }) => {
    ctl.input.clearInput();
    if (focusInput) ctl.input.focus();
  });

  const app = appObjectActor(ctl, actor, sources, applyView);
  app.actions = {
    [OneputAction.SUBMIT]: {
      action: () => {
        const submit = { type: 'INSERT_FORMULA' } as const;
        if (!actor.getSnapshot().can(submit)) return false;
        actor.send(submit);
        return true;
      }
    },
    TOGGLE_DISPLAY_MODE: {
      action: () => {
        actor.send({ type: 'TOGGLE_DISPLAY_MODE' });
        ctl.pull.notify();
      },
      binding: { bindings: ['$mod+d'], description: 'Toggle katex display mode' }
    }
  };
  return app;
}

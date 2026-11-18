import type { AppObject, Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { createActor } from 'xstate';
import { renderActiveView, type ApplyView } from '../interpreter.js';
import { readColourResult, type ColourResult } from './actions.js';
import { colourPicker } from './machine.js';
import { lists } from './sources.js';

type ColourChosen = { type: 'COLOUR_CHOSEN' } & ColourResult;

/** Make a fresh child for each call to app.run. Back uses the default stack pop. */
function createColourPicker(ctl: Controller, apply: ApplyView): AppObject {
  const actor = createActor(colourPicker);
  return {
    onStart() {
      actor.on('picked', ({ payload }) => ctl.app.exit(payload));
      actor.start();
      const rendered = renderActiveView(ctl, actor, { text: {}, lists }, apply);
      if (rendered.isErr()) ctl.notify(rendered.error);
    },
    onExit() {
      actor.stop();
    }
  };
}

/** Show the parent boundary. The host supplies the form's event receiver. */
export function createColourForm(
  ctl: Controller,
  apply: ApplyView,
  send: (event: ColourChosen) => void
): AppObject {
  return {
    layout: { params: { menuTitle: 'Form' } },
    menu: () => ({
      id: 'colour-form',
      items: [
        stdMenuItem({
          id: 'pick-colour',
          textContent: 'Pick a colour…',
          action: () => ctl.app.run(createColourPicker(ctl, apply))
        })
      ]
    }),
    onResume: function colourResult(result) {
      if (result?.payload === undefined) return;
      const checked = readColourResult(result.payload);
      if (checked.isErr()) {
        ctl.notify(checked.error);
        return;
      }
      send({ type: 'COLOUR_CHOSEN', colour: checked.value.colour });
    }
  };
}

import { picker } from './actions.js';

/** Select one offered colour in a child AppObject. */
export const colourPicker = picker.createMachine({
  id: 'colour-picker',
  description: 'Return a colour to the parent form.',
  initial: 'picking',
  states: {
    picking: {
      description: 'Show the available colours and allow Back to cancel.',
      meta: {
        view: {
          title: 'Pick a colour',
          menu: { id: 'colours', from: 'colours' },
          actions: {},
          settings: { enableGoBack: true }
        }
      },
      on: {
        PICK_COLOUR: {
          guard: 'isOfferedColour',
          target: 'picked',
          actions: 'returnColour',
          description: 'Check the selected ID and return its colour.'
        }
      }
    },
    picked: {
      type: 'final',
      description: 'Stop accepting selections as the child exits.'
    }
  }
});

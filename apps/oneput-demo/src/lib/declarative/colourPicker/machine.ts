import { form, picker } from './actions.js';

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
          settings: { enableGoBack: true }
        }
      },
      on: {
        ITEM_ACTIVATED: {
          guard: 'isOfferedColour',
          actions: 'returnColour',
          description: 'Check the selected ID and return its colour.'
        }
      }
    }
  }
});

/** The same parent actor receives the child result when Oneput resumes it. */
export const colourForm = form.createMachine({
  id: 'colour-form',
  description: 'Open the colour picker and show the returned colour.',
  initial: 'showingForm',
  context: { colour: null },
  states: {
    showingForm: {
      description: 'Show the current selection and let the user open the picker.',
      meta: {
        view: {
          title: 'Form',
          menu: {
            id: 'colour-form',
            items: [
              {
                id: 'pick-colour',
                text: 'Pick a colour…',
                detail: { from: 'colourLabel' },
                activate: true
              }
            ]
          },
          settings: {}
        }
      },
      on: {
        ITEM_ACTIVATED: {
          guard: 'activatesPicker',
          actions: 'openPicker',
          description: 'Open a fresh picker AppObject.'
        },
        RESUMED: {
          actions: 'readResult',
          description: 'Store the returned colour if the picker returned one.'
        }
      }
    }
  }
});

import type { Controller } from '../../../controllers/controller.js';
import type { MenuItem } from '../../../types.js';
import { stdMenuItem } from './stdMenuItem.js';

export type CheckboxMenuItemParams = {
  id: string;
  action: (c: Controller, checked: boolean, node: HTMLInputElement) => void;
  textContent: string;
  checked: boolean;
};

export function checkboxMenuItem(params: CheckboxMenuItemParams): MenuItem {
  const inputId = params.id + '-input';
  let inputElement: HTMLInputElement | undefined;

  const item = stdMenuItem({
    id: params.id,
    tag: 'button',
    attr: { type: 'button' },
    textContent: params.textContent,
    left: (b) => [
      b.fchild({
        id: inputId,
        tag: 'input',
        attr: {
          type: 'checkbox',
          title: params.textContent,
          checked: params.checked,
          onclick: (event: Event) => {
            event.preventDefault();
          }
        },
        classes: ['oneput__checkbox']
      })
    ],
    onMount: () => {
      inputElement = document.getElementById(inputId) as HTMLInputElement;
    }
  });

  item.action = (c: Controller) => {
    if (!inputElement) return;
    inputElement.checked = !inputElement.checked;
    params.action(c, inputElement.checked, inputElement);
  };

  return item;
}

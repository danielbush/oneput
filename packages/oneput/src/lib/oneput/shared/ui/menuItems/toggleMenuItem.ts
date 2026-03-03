import type { Controller } from '../../../controllers/controller.js';
import { randomId } from '../../../lib/utils.js';
import type { FlexChildren, FlexParams, MenuItem } from '../../../types.js';
import { FlexChildBuilder } from '../../../lib/builder.js';

export type ToggleMenuItemParams = {
  id?: string;
  label: string;
  values: string[];
  index: number;
  onToggle: (index: number) => void;
  left?: (b: FlexChildBuilder) => FlexChildren;
  bottom?: {
    textContent?: string;
  };
};

export class ToggleMenuItem implements MenuItem {
  id: string;
  valueId: string;
  type = 'vflex' as const;
  tag = 'button';
  attr = { type: 'button' };
  classes = ['oneput__std-menu-item'];
  children: FlexParams['children'];

  #values: string[];
  #index: number;
  #label: string;
  #onToggle: (index: number) => void;
  #valueElement?: HTMLElement;

  constructor(params: ToggleMenuItemParams) {
    this.id = params.id ?? randomId();
    this.valueId = randomId();
    this.#values = params.values;
    this.#index = params.index;
    this.#label = params.label;
    this.#onToggle = params.onToggle;

    const bottomText = params.bottom?.textContent ?? 'Press enter to toggle';

    const b = new FlexChildBuilder(this.id);

    this.children = [
      // top row
      {
        id: this.id + '-top',
        type: 'hflex' as const,
        classes: ['oneput__std-menu-item-top'],
        children: [
          // left
          ...(params.left
            ? [
                {
                  id: this.id + '-left',
                  type: 'hflex' as const,
                  classes: ['oneput__std-menu-item-left'],
                  children: params.left(b)
                }
              ]
            : []),

          // center
          {
            id: this.id + '-center',
            type: 'hflex' as const,
            classes: ['oneput__std-menu-item-center'],
            children: [
              {
                id: this.valueId,
                type: 'fchild' as const,
                classes: ['oneput__std-menu-item-title'],
                textContent: `${this.#label}: ${this.#values[this.#index]}`
              }
            ]
          }
        ]
      },

      // divider
      {
        id: randomId(),
        type: 'fchild' as const,
        classes: ['oneput__std-menu-item-divider'],
        tag: 'hr'
      },

      // bottom row
      {
        id: this.id + '-bottom',
        type: 'hflex' as const,
        classes: ['oneput__std-menu-item-bottom'],
        children: [
          {
            id: randomId(),
            type: 'fchild' as const,
            textContent: bottomText,
            classes: ['oneput__std-menu-item-bottom']
          }
        ]
      }
    ];
  }

  onMount = (node: HTMLElement) => {
    this.#valueElement = node.querySelector(`#${this.valueId}`) as HTMLElement;
  };

  action = (_c: Controller) => {
    this.#index = (this.#index + 1) % this.#values.length;
    if (this.#valueElement) {
      this.#valueElement.textContent = `${this.#label}: ${this.#values[this.#index]}`;
    }
    this.#onToggle(this.#index);
  };
}

export function toggleMenuItem(params: ToggleMenuItemParams): ToggleMenuItem {
  return new ToggleMenuItem(params);
}

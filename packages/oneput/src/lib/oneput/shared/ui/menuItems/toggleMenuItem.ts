import type { FlexChildBuilder } from '../../../lib/builder.js';
import type { FlexChildren, MenuItem } from '../../../types.js';
import { stdMenuItem } from './stdMenuItem.js';

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

export function toggleMenuItem(params: ToggleMenuItemParams): MenuItem {
  let index = params.index;
  let titleElement: HTMLElement | undefined;

  const getText = () => `${params.label}: ${params.values[index]}`;

  return stdMenuItem({
    id: params.id,
    tag: 'button',
    attr: { type: 'button' },
    textContent: getText(),
    left: params.left,
    bottom: {
      textContent: params.bottom?.textContent ?? 'Press enter to toggle'
    },
    onMount: (node: HTMLElement) => {
      titleElement = node.querySelector('.oneput__std-menu-item-title') as HTMLElement;
    },
    action: () => {
      index = (index + 1) % params.values.length;
      if (titleElement) {
        titleElement.textContent = getText();
      }
      params.onToggle(index);
    }
  });
}

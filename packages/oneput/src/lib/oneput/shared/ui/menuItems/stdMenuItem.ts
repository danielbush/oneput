import type { Controller } from '../../../controllers/controller.js';
import { vflex, type FlexChildBuilder } from '../../../lib/builder.js';
import { randomId } from '../../../lib/utils.js';
import type { FlexChildren, MenuItem } from '../../../types.js';

/**
 * Value object mapping a root ID to the deterministic IDs of each structural
 * part of a stdMenuItem. Use this to reference child nodes by ID rather than
 * querying by class name.
 */
export class StdMenuItemIds {
  constructor(readonly root: string) {}
  get top() {
    return this.root + '-top';
  }
  get left() {
    return this.root + '-left';
  }
  get center() {
    return this.root + '-center';
  }
  get title() {
    return this.root + '-title';
  }
  get right() {
    return this.root + '-right';
  }
  get divider() {
    return this.root + '-divider';
  }
  get bottom() {
    return this.root + '-bottom';
  }
  get bottomLeft() {
    return this.root + '-bottom-left';
  }
  get bottomCenter() {
    return this.root + '-bottom-center';
  }
  get bottomRight() {
    return this.root + '-bottom-right';
  }
}

export type StdMenuItem = MenuItem & { ids: StdMenuItemIds };

/**
 * If action is specified, tag will be set to button.
 * If tag is set to button, type="button" will be set.
 */
export type StdMenuItemParams<D extends Record<string, unknown> = Record<string, unknown>> = {
  tag?: string;
  attr?: Record<string, string | boolean | ((event: Event) => void)>;
  id?: string;
  action?: (ctl: Controller) => void;
  /**
   * Whether to close the menu after performing the action.  Defaults to true.
   */
  closeMenuOnAction?: boolean;
  classes?: Array<string | false | undefined>;
  style?: Partial<CSSStyleDeclaration>;
  htmlContentUnsafe?: string;
  textContent?: string;
  left?: false | ((b: FlexChildBuilder) => FlexChildren);
  right?: false | ((b: FlexChildBuilder) => FlexChildren);
  bottom?: {
    left?: false | ((b: FlexChildBuilder) => FlexChildren);
    right?: false | ((b: FlexChildBuilder) => FlexChildren);
    htmlContentUnsafe?: string;
    textContent?: string;
  };
  onMount?: (node: HTMLElement) => void | (() => void);
  data?: D;
};

/**
 * Represents a menu item with optional left/right icons, ability to float
 * additional content to the right and an optional bottom section where you can
 * put more detail.
 *
 * See src/routes/ for examples.
 */
export function stdMenuItem(params: StdMenuItemParams): StdMenuItem {
  const id = params.id ?? randomId();
  const ids = new StdMenuItemIds(id);
  if (params.action) {
    params.tag = params.tag ?? 'button';
    params.attr = {
      type: 'button',
      ...params.attr
    };
  }
  const menuItem = vflex({
    ...params,
    id,
    // action: params.action,
    action: (ctl) => {
      params.action?.(ctl);
      if (params.closeMenuOnAction ?? true) {
        ctl.menu.closeMenu();
      }
    },
    classes: [
      'oneput__std-menu-item',
      params.left === false && 'oneput__std-menu-item--no-left',
      params.right === false && 'oneput__std-menu-item--no-right',
      params.bottom?.left === false && 'oneput__std-menu-item--no-bottom-left',
      params.bottom?.right === false && 'oneput__std-menu-item--no-bottom-right'
    ],
    children: (b) => [
      b.hflex({
        id: ids.top,
        classes: ['oneput__std-menu-item-top'],
        children: (b) => [
          // left
          params.left
            ? b.hflex({
                id: ids.left,
                classes: ['oneput__std-menu-item-left'],
                children: (b) => (params.left ? params.left(b) : [])
              })
            : params.left === false
              ? null
              : b.spacer(),

          // center
          b.hflex({
            id: ids.center,
            classes: ['oneput__std-menu-item-center'],
            children: (b) => [
              b.fchild({
                id: ids.title,
                classes: ['oneput__std-menu-item-title'],
                textContent: params.textContent,
                htmlContentUnsafe: params.htmlContentUnsafe
              })
            ]
          }),

          // right
          params.right
            ? b.hflex({
                id: ids.right,
                classes: ['oneput__std-menu-item-right'],
                children: (b) => (params.right ? params.right?.(b) || [] : [])
              })
            : params.right === false
              ? null
              : b.spacer()
        ]
      }),
      ...(params.bottom
        ? [
            // divider
            b.fchild({
              id: ids.divider,
              type: 'fchild',
              classes: ['oneput__std-menu-item-divider'],
              tag: 'hr'
            }),
            b.hflex({
              id: ids.bottom,
              classes: ['oneput__std-menu-item-bottom'],
              children: (b) => [
                // left
                params.bottom?.left
                  ? b.hflex({
                      id: ids.bottomLeft,
                      classes: ['oneput__std-menu-item-bottom-left'],
                      children: (b) => (params.bottom?.left ? params.bottom.left(b) : [])
                    })
                  : params.bottom?.left === false
                    ? null
                    : b.spacer(true, false),

                // center
                b.fchild({
                  id: ids.bottomCenter,
                  textContent: params.bottom?.textContent,
                  htmlContentUnsafe: params.bottom?.htmlContentUnsafe,
                  classes: ['oneput__std-menu-item-bottom']
                }),

                // right
                params.bottom?.right
                  ? b.hflex({
                      id: ids.bottomRight,
                      classes: ['oneput__std-menu-item-bottom-right'],
                      children: (b) => (params.bottom?.right ? params.bottom.right(b) : [])
                    })
                  : params.bottom?.right === false
                    ? null
                    : b.spacer(true, false)
              ]
            })
          ]
        : [])
    ]
  }) as StdMenuItem;
  menuItem.ids = ids;

  return menuItem;
}

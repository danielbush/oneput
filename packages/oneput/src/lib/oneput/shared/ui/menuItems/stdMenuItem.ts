import type { Controller } from '../../../controllers/controller.js';
import { vflex, type FlexChildBuilder } from '../../../lib/builder.js';
import { randomId } from '../../../lib/utils.js';
import type { FlexChildren, MenuItem } from '../../../types.js';
import { bindingToKbdHtml } from '../kbd.js';

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
  get bindingHint() {
    return this.root + '-binding-hint';
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
  /**
   * false = always shown, never matched/highlighted by the filter. Defaults
   * true. See {@link MenuItem.canFilter}.
   */
  canFilter?: boolean;
  classes?: Array<string | false | undefined>;
  style?: Partial<CSSStyleDeclaration>;
  htmlContentUnsafe?: string;
  textContent?: string;
  left?: false | ((b: FlexChildBuilder) => FlexChildren);
  right?: false | ((b: FlexChildBuilder) => FlexChildren);
  /**
   * Tinykeys chord shown as `oneput__kbd` in the right section
   * (e.g. `$mod+Enter`). Rendered before any `right` children.
   */
  bindingHint?: string;
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
  const { bindingHint, ...itemParams } = params;
  const id = itemParams.id ?? randomId();
  const ids = new StdMenuItemIds(id);
  if (itemParams.action) {
    itemParams.tag = itemParams.tag ?? 'button';
    itemParams.attr = {
      type: 'button',
      ...itemParams.attr
    };
  }
  const hint = bindingHint?.trim();
  const hasHint = Boolean(hint);
  const hasRight = typeof itemParams.right === 'function';
  const hideRight = itemParams.right === false && !hasHint;
  const menuItem = vflex({
    ...itemParams,
    id,
    action: itemParams.action
      ? (ctl) => {
          itemParams.action?.(ctl);
          if (itemParams.closeMenuOnAction ?? false) {
            ctl.menu.closeMenu();
          }
        }
      : undefined,
    classes: [
      'oneput__std-menu-item',
      itemParams.left === false && 'oneput__std-menu-item--no-left',
      hideRight && 'oneput__std-menu-item--no-right',
      itemParams.bottom?.left === false && 'oneput__std-menu-item--no-bottom-left',
      itemParams.bottom?.right === false && 'oneput__std-menu-item--no-bottom-right'
    ],
    children: (b) => [
      b.hflex({
        id: ids.top,
        classes: ['oneput__std-menu-item-top'],
        children: (b) => [
          // left
          itemParams.left
            ? b.hflex({
                id: ids.left,
                classes: ['oneput__std-menu-item-left'],
                children: (b) => (itemParams.left ? itemParams.left(b) : [])
              })
            : itemParams.left === false
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
                textContent: itemParams.textContent,
                htmlContentUnsafe: itemParams.htmlContentUnsafe
              })
            ]
          }),

          // right
          hasRight || hasHint
            ? b.hflex({
                id: ids.right,
                classes: ['oneput__std-menu-item-right'],
                children: (b) => [
                  ...(hint
                    ? [
                        b.fchild({
                          id: ids.bindingHint,
                          style: { flex: '0' },
                          innerHTMLUnsafe: bindingToKbdHtml(hint),
                          classes: ['oneput__kbd']
                        })
                      ]
                    : []),
                  ...(hasRight && itemParams.right ? itemParams.right(b) : [])
                ]
              })
            : itemParams.right === false
              ? null
              : b.spacer()
        ]
      }),
      ...(itemParams.bottom
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
                itemParams.bottom?.left
                  ? b.hflex({
                      id: ids.bottomLeft,
                      classes: ['oneput__std-menu-item-bottom-left'],
                      children: (b) => (itemParams.bottom?.left ? itemParams.bottom.left(b) : [])
                    })
                  : itemParams.bottom?.left === false
                    ? null
                    : b.spacer(true, false),

                // center
                b.fchild({
                  id: ids.bottomCenter,
                  textContent: itemParams.bottom?.textContent,
                  htmlContentUnsafe: itemParams.bottom?.htmlContentUnsafe,
                  classes: ['oneput__std-menu-item-bottom']
                }),

                // right
                itemParams.bottom?.right
                  ? b.hflex({
                      id: ids.bottomRight,
                      classes: ['oneput__std-menu-item-bottom-right'],
                      children: (b) => (itemParams.bottom?.right ? itemParams.bottom.right(b) : [])
                    })
                  : itemParams.bottom?.right === false
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

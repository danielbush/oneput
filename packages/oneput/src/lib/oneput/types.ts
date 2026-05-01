import type { Controller } from './controllers/controller.js';
import type { ActionBinding } from './lib/bindings.js';

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: unknown) => void;
    };
  }
  /**
   * The controller will register an event listener for 'message'. Prevent this
   * happening multiple times. Probably more an issue when hot reloading.
   */
  var messageListenerIsSetup: boolean;
  var insertImage: (dataUrl: string, fileName: string) => void;
}

export type InputChangeListener = (evt: InputEvent) => void;

export type OneputProps = {
  /**
   * The index of the menu item that is focused.
   * If the boolean is set to true the item will be scrolled into view which
   * is desirable if the focus was triggered by a keybinding.
   */
  menuItemFocus?: [number, boolean?];
  menuOpen: boolean;
  menuItems?: Array<MenuItemAny>;
  inputElement?: HTMLInputElement | HTMLTextAreaElement;
  inputValue?: string;
  placeholder?: string;
  onInputChange?: InputChangeListener;
  onMenuOpenChange?: (menuOpen: boolean) => void;
  onMenuAction?: (evt: Event, item: MenuItem, index: number) => void;
  onMenuItemEnter?: (evt: Event, item: MenuItem, index: number) => void;
  replaceMenuUI?: {
    menu?: FlexParams;
  };
  injectUI?: {
    inner?: FlexParams;
  };
  menuUI?: {
    header?: FlexParams;
    footer?: FlexParams;
  };
  innerUI?: FlexParams;
  outerUI?: FlexParams;
  inputUI?: {
    textArea?: boolean | { rows: number };
    left?: FlexParams;
    right?: FlexParams;
    outerLeft?: FlexParams;
    outerRight?: FlexParams;
  };
  menuAnimationDuration?: number;
  injectAnimationDuration?: number;
  replaceAnimationDuration?: number;
};

export type FlexChildren = Array<FlexParams | FChildParams | undefined | null | false | ''>;

/**
 * Represents a either a horizontal or vertical flex container which is used to
 * represent top-level menu items or dividers but can also be used to structure
 * and layout content both within these top-level items and other parts of
 * oneput outside of the menu area.
 */
export type FlexParams = {
  tag?: string;
  attr?: Record<string, string | boolean | ((event: Event) => void)>;
  id: string;
  classes?: Array<string | false | undefined>;
  style?: Partial<CSSStyleDeclaration>;
  type: 'hflex' | 'vflex';
  /**
   * Allow null/undefined children - it makes writing the flex/child
   * data-structures easier without adding extra array filter loops to remove
   * them.
   */
  children?: FlexChildren;
  /**
   * Instructs Oneput rendered to override default list of HTML void elements.
   */
  voidElements?: Set<string | undefined>;
  action?: (c: Controller) => void;
  attachments?: Record<symbol, (element: HTMLElement) => void>;
  onMount?: (node: HTMLElement) => void | (() => void);
};

export type MenuItemsFn = (
  input: string,
  items: MenuItemAny[]
) => Array<MenuItemAny> | undefined | void;
export type MenuItemsFnAsync = (
  input: string,
  items: MenuItemAny[]
) => Promise<Array<MenuItemAny> | undefined>;

/**
 * Focus behaviours decide which item to focus on when a menu is displayed.
 *
 * - Comma separated values means: try the first value first, then fall back to the next, etc.
 * - "last-action" = Try to focus on the last executed action item for a given menu
 *   - menus are identified by an id in setMenu
 *   - menu id's are scoped to the current appObject
 */
export type FocusBehaviour = 'last-action,first' | 'first' | 'last' | 'none';

export type Menu = {
  /**
   * Identifies the menu.
   */
  id: string;
  focusBehaviour?: FocusBehaviour;
  items: Array<MenuItemAny | undefined | null | '' | false>;
};

export type MenuItem<D extends Record<string, unknown> = Record<string, unknown>> = FlexParams & {
  /**
   * Instructs Oneput renderer to add a pointerdown handler to run this action
   * on top-level menu items.
   */
  action?: (c: Controller) => void;
  /**
   * ignored = false means menu item can be focused and selected and triggered.
   */
  ignored?: boolean;
  /**
   * Primary css class.  Defaults to oneput__menu-item.
   */
  class?: string;
  /**
   * Intended to store temporary data when displaying and processing menu
   * items in AppObjects.
   */
  data?: D;
};

export type MenuItemDivider = FlexParams & {
  /**
   * ignored = true means Item is not meant to be interactive with eg a divider.
   */
  ignored: true;
  /**
   * Primary css class.  You might want to use oneput__menu-divider etc.
   */
  class?: string;
};

export type MenuItemAny = MenuItem | MenuItemDivider;

export type FChildParams = {
  id: string;
  tag?: string;
  /**
   * Use boolean for boolean attributes, like `disabled`, `checked`, etc.
   */
  attr?: Record<string, string | boolean | ((event: Event) => void)>;
  /**
   * This is optional.  It also makes satisfying the type-checker easier.
   */
  type: 'fchild';
  classes?: Array<string | false | undefined>;
  style?: Partial<CSSStyleDeclaration>;
  textContent?: string;
  htmlContentUnsafe?: string;
  /**
   * Use innerHTMLUnsafe for icons or decorative content.  Use
   * htmlContentUnsafe for actual content.
   */
  innerHTMLUnsafe?: string;
  /**
   * Name of a registered icon to render.
   * Use registerIcon() or registerIcons() to register icons before use.
   * Takes precedence over innerHTMLUnsafe when both are specified.
   */
  icon?: string;
  /**
   * Is set by a menuItemsFn (via Oneput controller) usually to show
   * highlighted text when user is filtering menu items by typing.
   */
  derivedHTML?: string;
  onMount?: (node: HTMLElement) => void | (() => void);
  /** List of HTML void elements. */
  voidElements?: Set<string | undefined>;
};

/**
 * Represents a screen or state in the Oneput app stack.
 *
 * AppObjects are managed by AppController which maintains a stack — run() pushes,
 * exit() pops. Each AppObject can declare actions (with optional key bindings)
 * and menu items declaratively.
 *
 * @typeParam R - The type of payload that a child AppObject can return via exit().
 */
export interface AppObject<R = unknown> {
  /**
   * Called when the AppObject has been instantiated and is then given control
   * of Oneput.
   */
  onStart: () => void;
  /**
   * Called on the current AppObect if it's about to launch a child AppObject in
   * its place (via ctl.app.run).  It will resume when the child AppObject
   * exits.
   */
  onSuspend?: () => void;
  /**
   * Called when a child AppObject that is run with ctl.app.run(...) calls
   * ctl.app.exit to return to this instance.
   *
   * The child can return a payload via ctl.app.exit({ payload }) which will be
   * passed to this method.
   *
   * If not implemented, onStart will be called instead.  onStart will not be
   * passed the result.  So you should implement onResume if you want to pass a
   * result back to this instance.
   */
  onResume?: (result?: { payload?: R }) => void;
  /**
   * Called when this AppObject exits.
   *
   * The AppObject can allow the user to trigger an exit (eg via an unhandled
   * back action) so this hook can be used to clean up any resources or perform
   * any necessary cleanup tasks.
   */
  onExit?: () => void;
  onMenuItemFocus?: (data: { menuItem: MenuItem | undefined; index: number }) => void;
  /**
   * If actionId is a binding, the action defined here will take precedence over
   * "default" actions defined against bindings outside of any AppObject.
   *
   * You may prefer to define your bindings in one spot outside of AppObject's
   * or you want your AppObject's to handle specific ones which you can set
   * here.
   */
  actions?: {
    [actionId: string]: { action: (ctl: Controller) => void; binding?: ActionBinding };
  };
  /**
   * A declarative way to set your menu items.
   *
   * If set, the system will do the equivalent of calling setMenu for you.
   *
   * We use a function to ensure that menu items are re-executed when AppObjects
   * are resumed. This makes easier to work with state that persists beyond the
   * life of an Appboject. An example is managing the checked state on
   * checkBoxMenuItem .
   */
  menu?: () => Menu;
}

export type NullishChildren = Array<FlexParams | FChildParams | '' | false | null | undefined>;

export type UIFlags = {
  enableGoBack?: boolean;
  enableMenuOpenClose?: boolean;
  enableKeys?: boolean;
  enableMenuActions?: boolean;
  enableMenuItemsFn?: boolean;
  enableInputElement?: boolean;
  enableModal?: boolean;
};

export interface UILayout {
  configure(settings: { params?: Record<string, unknown> }): void;
  inputUI?: OneputProps['inputUI'];
  menuUI?: OneputProps['menuUI'];
  innerUI?: OneputProps['innerUI'];
  outerUI?: OneputProps['outerUI'];
}

export abstract class DynamicPlaceholderBase {
  abstract enable(setPlaceholder: (msg?: string) => void): void;
  abstract disable(): void;
}

export type InputSelectionState =
  | 'SELECT_ALL'
  | 'SELECT_PARTIAL'
  | 'CURSOR_AT_BEGINNING'
  | 'CURSOR_AT_MIDDLE'
  | 'CURSOR_AT_END'
  | 'EMPTY';

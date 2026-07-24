import type { Controller } from './controllers/controller.js';
import type { ActionBinding } from './lib/bindings.js';
import type { KeysController } from './controllers/KeysController.js';

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
  /**
   * When true, the displayed menu is dimmed + non-interactive (CSS adds the
   * visual; `disableActions` gates the behaviour). Driven by
   * `ctl.menu.setDisabled`. Used to freeze the current menu in place during a
   * transition (e.g. loading the next screen) without re-rendering its items.
   */
  menuDisabled?: boolean;
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

export type FlexRealChild = FlexParams | FChildParams;
export const isFlexRealChild = (c: FlexChildren[number]): c is FlexRealChild => Boolean(c);

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

/**
 * The FILTER signature: `(query, base) => subset` (+highlight). Reads the base
 * and returns the items to display. A filter may also return the id of the item
 * focus should land on for this filtered result.
 *
 * If undefined/void is returned => "do not update the displayed menu items".
 */
export type FilterResult = {
  items: Array<MenuItemAny>;
  focusItemId?: string;
};

export type MenuItemsFilterFn = (
  input: string,
  items: MenuItemAny[]
) => FilterResult | undefined | void;

/**
 * Generates items purely from the input.
 */
export type MenuItemsGenFnAsync = (input: string) => Promise<Array<MenuItemAny> | undefined>;

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
   * canFilter = false pins the item: it is always shown, never matched or
   * highlighted by the filter (WordFilter/FuzzyFilter). Use for menu "chrome"
   * such as a `..` / Cancel item that should survive a typed query. Defaults to
   * true. WordFilter keeps pins in place; FuzzyFilter keeps top/bottom pins at
   * those extremes and collects any other pin just above the trailing pins
   * (since it reorders the matched middle by score).
   */
  canFilter?: boolean;
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
   * false = always shown, never matched by the filter. See {@link MenuItem.canFilter}.
   */
  canFilter?: boolean;
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
 * Map of app-event name -> payload.  Oneput ships it empty; host apps augment
 * it via declaration merging so events are typed end to end:
 *
 *   declare module '@oneput/oneput' {
 *     interface AppEventMap {
 *       'node-click': { id: string };
 *     }
 *   }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AppEventMap {}

/**
 * A host-app event delivered to the currently active AppObject via
 * ctl.app.emitEvent(...).  When AppEventMap is augmented this is a discriminated
 * union (so `event.type === 'x'` narrows `payload`); before augmentation it
 * falls back to a generic shape so Oneput stays usable and domain-agnostic.
 */
export type AppEvent = [keyof AppEventMap] extends [never]
  ? { type: string; payload?: unknown }
  : {
      [K in keyof AppEventMap]: { type: K; payload: AppEventMap[K] };
    }[keyof AppEventMap];

/**
 * Context supplied when Oneput dispatches an action.
 *
 * Keyboard actions include the browser event. Menu actions include the menu
 * row id that produced it.
 */
export type AppActionContext =
  | { source: 'keyboard'; event: KeyboardEvent }
  | { source: 'menu'; menuId: string; menuActionId: string };

export type AppActionHandler<Context extends AppActionContext = AppActionContext> = (
  ctl: Controller,
  context?: Context
) => void;

export type AppAction<Context extends AppActionContext = AppActionContext> = {
  action: AppActionHandler<Context>;
  binding?: ActionBinding;
};

/**
 * Map of actionId -> action (with optional key binding) declared by an
 * AppObject. See {@link AppObject.actions}.
 */
export type AppActions<Context extends AppActionContext = AppActionContext> = {
  [actionId: string]: AppAction<Context>;
};

/**
 * Signal that the current AppObject can exit carrying a result.
 *
 * Sent via `ctl.ui.update({ params: { exitWithResult } })`. Layouts may surface
 * this (e.g. a tick in the menu header); they are not required to. Cancel /
 * discard remains a bare `ctl.app.exit()`.
 */
export type ExitWithResult = {
  /** Typically `() => ctl.app.exit(taggedResult)`. */
  run: () => void;
  /** When false, hosts should show the affordance disabled. Defaults to true. */
  enabled?: boolean;
};

/**
 * Layout parameters that Oneput AppObjects may use as a shared convention.
 *
 * Layouts decide whether and how to use these values; AppController only passes
 * them through. App-specific layouts can extend this type with their own params.
 *
 * ```ts
 * type LayoutSettings = AppLayoutParams & {
 *   outerRight?: (b: FlexChildBuilder) => FChildParams;
 * };
 * ```
 */
export type AppLayoutParams = {
  /**
   * Preferred title for layouts that render a menu header.
   */
  menuTitle?: string;
  /**
   * Optional “exit with result” signal for host layouts (e.g. menu header tick).
   */
  exitWithResult?: ExitWithResult;
};

export type InstallLayout<LayoutParams extends AppLayoutParams = AppLayoutParams> = {
  /**
   * Create the layout for this AppObject.
   *
   * Most apps can pass a layout factory directly:
   *
   * ```ts
   * layout = { layout: Layout.create, params: { menuTitle: 'Home' } };
   * ```
   *
   * Apps that inject nullable/test layouts can pass a wrapper instead:
   *
   * ```ts
   * layout = { layout: (ctl, params) => this.create.Layout(ctl, params), params };
   * ```
   */
  layout: (ctl: Controller, params: LayoutParams) => UILayout<LayoutParams>;
  params: LayoutParams;
};

/**
 * Configure the layout inherited from the parent AppObject.
 *
 * Use this when the AppObject should keep the current layout instance but adjust
 * its params before `onStart`/`onResume` runs, for example to set `menuTitle`.
 * Params are partial because the inherited layout has already been created.
 */
export type ConfigureInheritedLayout<LayoutParams extends AppLayoutParams = AppLayoutParams> = {
  layout?: undefined;
  params?: Partial<LayoutParams>;
};

export type AppLayoutConfig<LayoutParams extends AppLayoutParams = AppLayoutParams> =
  | InstallLayout<LayoutParams>
  | ConfigureInheritedLayout<LayoutParams>;

/**
 * Represents a screen or state in the Oneput app stack.
 *
 * AppObjects are managed by AppController which maintains a stack — run() pushes,
 * exit() pops. Each AppObject can declare actions (with optional key bindings)
 * and menu items declaratively.
 *
 * @typeParam ResumePayload - The type of payload this AppObject can receive
 * from a child AppObject when the child exits.
 */
export interface AppObject<
  ResumePayload = unknown,
  LayoutParams extends AppLayoutParams = AppLayoutParams
> {
  /**
   * The layout configuration for this AppObject.
   *
   * Provide a layout factory with its required params to replace the active
   * layout, or params alone to configure the inherited layout before
   * onStart/onResume. If no layout is specified, it is inherited from the parent.
   */
  layout?: AppLayoutConfig<LayoutParams>;
  /**
   * Settings that will be applied when the AppObject starts.
   */
  settings?: UIFlags;
  /**
   * Called when the AppObject has been instantiated and is then given control
   * of Oneput.
   */
  onStart?: () => void;
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
  onResume?: (result?: { payload?: ResumePayload }) => void;
  /**
   * Called when this AppObject exits.
   *
   * The AppObject can allow the user to trigger an exit (eg via an unhandled
   * back action) so this hook can be used to clean up any resources or perform
   * any necessary cleanup tasks.
   */
  onExit?: () => void;
  /**
   * Called when the user triggers "back" while this AppObject is current,
   * instead of the default pop. The declarative counterpart of
   * `ctl.app.setOnBack(...)`: use this when the handler is fixed for the
   * AppObject; use `setOnBack` when it changes with state (e.g. a wizard step).
   *
   * Precedence: an imperative `setOnBack` handler wins if one has been set
   * (it is cleared per-AppObject on start, so it only overrides while live).
   * If neither is present, back falls through to the default pop.
   */
  onBack?: () => void;
  onMenuItemFocus?: (data: { menuItem: MenuItem | undefined; index: number }) => void;
  /**
   * Called whenever the input value changes while this AppObject is current.
   *
   * The framework wires/unwires this for you (no manual `ctl.events.on`). Use it
   * for a sync-rebuild menu where typing should re-derive `menu()`: recompute any
   * derived state then call `ctl.menu.invalidate()`. Fires regardless of whether
   * the menu is open (invalidate itself no-ops while closed).
   */
  onInputChange?: (data: { value: string }) => void;
  /**
   * Called whenever the menu opens or closes while this AppObject is current.
   *
   * The declarative counterpart of subscribing to the `menu-open-change` event:
   * the framework wires/unwires this for you (no manual `ctl.events.on`).
   * `open` is `true` when the menu has just opened, `false` when it has closed.
   */
  onMenuOpenChange?: (data: { open: boolean }) => void;
  /**
   * Called when an app event is emitted via ctl.app.emitEvent(...) while this
   * AppObject is the active (current) one.  See {@link AppEvent} - these are
   * user-created events. This is how host-app UI rendered outside of Oneput
   * (e.g. a node on a canvas) can signal the active AppObject without
   * subscribing or knowing who handles it.  Only the current AppObject receives
   * the event.
   */
  onEvent?: (event: AppEvent) => void;
  /**
   * Provide the actions object directly for simple AppObjects whose actions are
   * fixed. For AppObjects whose actions depend on state, provide a function:
   * `ctl.app.invalidateActions()` re-calls it to re-derive the bindings (no
   * getter needed).
   *
   * You can also define actions defined against default bindings outside of any
   * AppObject, see {@link KeysController.setDefaultBindings}.
   */
  actions?: AppActions | (() => AppActions);
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
  enableGenerative?: boolean;
  enableFilter?: boolean;
  enableInputElement?: boolean;
  enableModal?: boolean;
  /**
   * Focus the Oneput input after an AppObject starts or resumes.
   *
   * Defaults to true. Set this to false in `AppObject.settings` for screens
   * that should leave focus somewhere else.
   */
  focusInputOnStart?: boolean;
  /**
   * Focus the Oneput input when the menu opens.
   *
   * Defaults to true. Set this to false in `AppObject.settings` for screens
   * that should keep focus where it is when opening the menu.
   */
  focusInputOnMenuOpen?: boolean;
  /**
   * Clear the Oneput input after a menu action runs.
   *
   * Defaults to true. If the action runs another AppObject, Oneput leaves the new
   * AppObject's input alone.
   */
  clearInputAfterAction?: boolean;
  /**
   * Clear the Oneput input after back handling runs.
   *
   * Defaults to true. If back navigation changes the current AppObject, Oneput
   * leaves the new AppObject's input alone.
   */
  clearInputAfterBack?: boolean;
  // why not closeMenuAfterAction ?
  // - individual menu actions may prefer to do their own thing based on the action;
  // - so leave the menu open and let indiviual actions choose what to do;
  // - stdMenuItem offers a close mechanism
};

export interface UILayout<LayoutParams extends AppLayoutParams = AppLayoutParams> {
  /**
   * Apply layout params. Default merges into current settings (mid-flight
   * patches). Pass `replace: true` to treat `params` as the new baseline
   * (used when an AppObject becomes current).
   */
  configure(settings: { params?: Partial<LayoutParams>; replace?: boolean }): void;
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

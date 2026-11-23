import type { Message } from '../shared/ui/Message.js';
import { AppEventsController } from './AppEventsController.js';
import { MenuController } from './MenuController.js';
import { InternalEventEmitter } from './InternalEventEmitter.js';
import { InputController } from './InputController.js';
import { KeysController } from './KeysController.js';
import { UIController } from './UIController.js';
import { Notification, type NotificationParams } from '../shared/ui/Notification.js';
import type { AppObject, OneputProps } from '../types.js';
import { Alert } from '../shared/ui/Alert.js';
import { Confirm } from '../shared/ui/Confirm.js';
import { AppController, type AppChange, type AppChangeTracker } from './AppController.js';
import { notifier } from '../lib/pull.js';

export class Controller {
  static create(currentProps: OneputProps) {
    const createControllers = (controller: Controller) => ({
      menu: MenuController.create(controller),
      input: InputController.create(controller),
      keys: KeysController.create(controller),
      ui: UIController.create(controller),
      app: AppController.create(controller)
    });
    return new Controller(currentProps, createControllers);
  }

  static createNull(props: Partial<OneputProps> = {}) {
    const currentProps: OneputProps = { menuOpen: false, ...props };
    const createControllers = (controller: Controller) => ({
      menu: MenuController.createNull(controller),
      input: InputController.createNull(controller),
      keys: KeysController.createNull(controller),
      ui: UIController.createNull(controller),
      app: AppController.createNull(controller)
    });
    return new Controller(currentProps, createControllers);
  }

  public events = new InternalEventEmitter();
  /** Host-app event bus. See {@link AppEventsController}. */
  public appEvents = new AppEventsController();
  public menu: MenuController;
  public input: InputController;
  public keys: KeysController;
  public ui: UIController;
  public app: AppController;
  /**
   * Tells the mounted pull widgets of this instance to paint again.
   *
   * A pull row calls `notify()` after its own click. The row does not hold
   * the widget: a rebuild makes a new row, but the widget from the first build
   * stays on the node. The widget subscribes here on mount, so the click
   * reaches it. See PULL_OBJECT in `docs/CONCEPTS.md`.
   */
  public pull = notifier();

  /**
   * @param currentProps Should be reactive eg $state<OneputProps>({...})
   */
  constructor(
    public currentProps: OneputProps,
    createControllers: (ctl: Controller) => {
      menu: MenuController;
      input: InputController;
      keys: KeysController;
      ui: UIController;
      app: AppController;
    }
  ) {
    const controllers = createControllers(this);
    this.menu = controllers.menu;
    this.input = controllers.input;
    this.keys = controllers.keys;
    this.ui = controllers.ui;
    this.app = controllers.app;
  }

  toggleHide() {
    window.dispatchEvent(new Event('oneput-toggle-hide'));
  }

  private notification = Notification.create(this);
  private destroyCallbacks = new Set<() => void>();

  notify(message: Message, params: NotificationParams = {}): Notification {
    this.notification.run(message, params);
    return this.notification;
  }
  clearNotifications() {
    this.notification.clear();
  }

  alert(params: { message: Message; additional?: Message }): Alert {
    const alert = Alert.create(this, params);
    alert.run();
    return alert;
  }

  confirm(params: { additional?: Message; message: Message }): Confirm {
    const confirm = Confirm.create(this, params);
    confirm.run();
    return confirm;
  }

  trackAppChanges(): AppChangeTracker {
    const data: AppChange[] = [];
    const stop = this.events.on('app-change', (payload) => {
      data.push(payload);
    });
    return { data, stop };
  }

  /** Register a cleanup that runs when the host destroys Oneput, and return its unsubscribe function. */
  onDestroy(fn: () => void): () => void {
    const callback = () => fn();
    this.destroyCallbacks.add(callback);
    return () => {
      this.destroyCallbacks.delete(callback);
    };
  }

  /**
   * Called by the host when it unmounts Oneput. Run the cleanups in
   * registration order, while the controller still works, then release
   * controller resources.
   */
  _destroy() {
    for (const callback of this.destroyCallbacks) callback();
    this.destroyCallbacks.clear();
    this.keys.destroy();
  }

  /**
   * Simulates the current app starting.  Usually this happens when Oneput is
   * mounted into the DOM.
   */
  simulateStart(run: (ctl: Controller) => AppObject) {
    this.app.run(run(this));
  }

  /** Open the menu and wait for its items to appear in controller state. */
  async simulateOpenMenu(): Promise<void> {
    this.menu.openMenu();
    // TODO: Wait for menu-open-change instead of using a timer.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  /** Simulate a click on a displayed menu item. */
  simulateMenuItemClick(itemId: string): void {
    if (!this.menu.isMenuOpen) throw new Error('Menu is closed');
    const items = this.currentProps.menuItems ?? [];
    const index = items.findIndex((item) => item.id === itemId);
    const item = items[index];
    if (!item || item.ignored) throw new Error(`Menu item "${itemId}" is not available`);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    this.currentProps.onMenuAction?.(event, item, index);
    if (typeof item.attr?.onclick === 'function') item.attr.onclick(event);
  }

  /**
   * Simulates a key press against Oneput's window-level key bindings.
   *
   * KeysController dispatches actions through a setTimeout to avoid menu-open
   * races, so tests should await this helper before asserting.
   */
  async simulateKey(key: string, init: KeyboardEventInit = {}, target: EventTarget = window) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...init
    });
    // Pass an element as `target` to simulate a key while that element has the
    // true (DOM) focus (e.g. Tab to the submit button, then Enter).
    target.dispatchEvent(event);
    await new Promise((resolve) => setTimeout(resolve, 0));
    // Read `defaultPrevented` to check whether Oneput took the key.
    return event;
  }
}

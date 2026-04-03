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
import { NativeController } from './NativeController.js';

export class Controller {
  static create(currentProps: OneputProps) {
    const createControllers = (controller: Controller) => ({
      menu: MenuController.create(controller),
      input: InputController.create(controller),
      keys: KeysController.create(controller),
      ui: UIController.create(controller),
      app: AppController.create(controller),
      native: NativeController.create(controller)
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
      app: AppController.createNull(controller),
      native: NativeController.createNull(controller)
    });
    return new Controller(currentProps, createControllers);
  }

  public events = new InternalEventEmitter();
  public menu: MenuController;
  public input: InputController;
  public keys: KeysController;
  public ui: UIController;
  public app: AppController;
  public native: NativeController;

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
      native: NativeController;
    }
  ) {
    const controllers = createControllers(this);
    this.menu = controllers.menu;
    this.input = controllers.input;
    this.keys = controllers.keys;
    this.ui = controllers.ui;
    this.app = controllers.app;
    this.native = controllers.native;
  }

  toggleHide() {
    window.dispatchEvent(new Event('oneput-toggle-hide'));
  }

  private notification = Notification.create(this);

  notify(message: string, params: NotificationParams = {}): Notification {
    this.notification.run(message, params);
    return this.notification;
  }
  clearNotifications() {
    this.notification.clear();
  }

  alert(params: { message: string; additional: string }): Alert {
    const alert = Alert.create(this, params);
    alert.run();
    return alert;
  }

  confirm(params: { additional?: string; message: string }): Confirm {
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

  /**
   * Simulates the current app starting.  Usually this happens when Oneput is
   * mounted into the DOM.
   */
  simulateStart(run: (ctl: Controller) => AppObject) {
    this.app.run(run(this));
  }

  /**
   * Simulates a key press against Oneput's window-level key bindings.
   *
   * KeysController dispatches actions through a setTimeout to avoid menu-open
   * races, so tests should await this helper before asserting.
   */
  async simulateKey(key: string, init: KeyboardEventInit = {}) {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...init
    });
    window.dispatchEvent(event);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

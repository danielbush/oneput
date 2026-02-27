import { MenuController } from './MenuController.js';
import { InternalEventEmitter } from './InternalEventEmitter.js';
import { InputController } from './InputController.js';
import { KeysController } from './KeysController.js';
import { UIController } from './UIController.js';
import { Notification, type NotificationParams } from '../shared/ui/Notification.js';
import type { OneputProps } from '../types.js';
import { Alert } from '../shared/ui/Alert.js';
import { Confirm } from '../shared/ui/Confirm.js';
import { AppController } from './AppController.js';
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
    return new Controller(currentProps, window, createControllers);
  }

  static createNull(win: Window, props: Partial<OneputProps> = {}) {
    const currentProps: OneputProps = { menuOpen: false, ...props };
    const createControllers = (controller: Controller) => ({
      menu: MenuController.create(controller),
      input: InputController.create(controller),
      keys: KeysController.create(controller),
      ui: UIController.create(controller),
      app: AppController.create(controller),
      native: NativeController.create(controller)
    });
    return new Controller(currentProps, win, createControllers);
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
    public window: Window,
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
    this.window.dispatchEvent(new Event('oneput-toggle-hide'));
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
}

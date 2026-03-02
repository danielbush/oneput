import type { Controller } from '@oneput/oneput';
import { Settings } from './Settings.js';
import { AsyncSearchExample } from './AsyncSearchExample.js';
import { NavigateHeadings } from './NavigateHeadings.js';
import { KatexDemo } from './KatexDemo.js';
import { TomatoTimer } from './tomatoTimer/TomatoTimer.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { Layout, type LayoutSettings } from './_layout.js';
import { icons } from './_icons.js';
import type { AppObject } from '@oneput/oneput';

export class Root implements AppObject {
  static create(ctl: Controller) {
    return new Root(ctl, {
      Layout: () => Layout.create(ctl),
      SettingsUI: () => Settings.create(ctl),
      NavigateHeadings: () => NavigateHeadings.create(ctl),
      TomatoTimer: () => TomatoTimer.create(ctl),
      KatexDemo: () => KatexDemo.create(ctl),
      AsyncSearchExample: () => AsyncSearchExample.create(ctl)
    });
  }

  constructor(
    private ctl: Controller,
    private create: {
      Layout: () => Layout;
      SettingsUI: () => Settings;
      NavigateHeadings: () => NavigateHeadings;
      TomatoTimer: () => TomatoTimer;
      KatexDemo: () => KatexDemo;
      AsyncSearchExample: () => AsyncSearchExample;
    }
  ) {
    ctl.ui.setLayout(this.create.Layout());
  }

  onStart = () => {
    this.run();
  };

  run = () => {
    this.ctl.ui.update<LayoutSettings>({
      params: {
        menuTitle: 'Home'
      },
      flags: {
        enableGoBack: false
      }
    });
    const blankItems = [...Array(10)].map((_, i) => {
      return stdMenuItem({
        id: `blank-item-${i}`,
        textContent: `Blank item ${i}`,
        action: () => {}
      });
    });
    this.ctl.menu.setMenu({
      id: 'main',
      items: [
        stdMenuItem({
          id: 'settings',
          left: (b) => [b.icon(icons.Settings)],
          textContent: 'Settings...',
          action: () => {
            this.ctl.app.run(this.create.SettingsUI());
          },
          right: (b) => [b.icon(icons.ChevronRight)]
        }),
        stdMenuItem({
          id: 'navigate-outline',
          left: (b) => [b.icon(icons.TableOfContents)],
          textContent: 'Navigate outline...',
          action: () => {
            this.ctl.app.run(this.create.NavigateHeadings());
          }
        }),
        stdMenuItem({
          id: 'tomato-timer',
          left: (b) => [b.icon(icons.Timer)],
          textContent: 'Tomato timer...',
          action: () => {
            this.ctl.app.run(this.create.TomatoTimer());
          },
          bottom: {
            textContent: 'A Pomodoro-like timer to demo timer widgets and state management...'
          }
        }),
        stdMenuItem({
          id: 'insert-katex',
          left: (b) => [b.icon(icons.Sigma)],
          textContent: 'Insert katex...',
          action: () => {
            this.ctl.app.run(this.create.KatexDemo());
          }
        }),
        window.ReactNativeWebView &&
          stdMenuItem({
            id: 'mobile-native-confirmation',
            left: (b) => [b.icon(icons.ChevronsLeftRightEllipsis)],
            textContent: 'Test mobile native bridge...',
            bottom: {
              textContent:
                'You should see a native confirmation dialog.  Click ok or cancel.  You should then see Oneput show a notfication within the webview.  This tests communication both ways.'
            },
            action: () => {
              window.ReactNativeWebView!.postMessage(
                JSON.stringify({
                  type: 'test',
                  title: 'Test Confirmation',
                  message: 'This is a test confirmation message.'
                })
              );
            }
          }),
        stdMenuItem({
          id: 'hide-oneput',
          left: (b) => [b.icon(icons.Command)],
          textContent: 'Hide',
          action: () => {
            this.ctl.toggleHide();
          }
        }),
        stdMenuItem({
          id: 'async-search',
          left: (b) => [b.icon(icons.Search)],
          textContent: 'Async menu items demo...',
          action: () => {
            this.ctl.app.run(this.create.AsyncSearchExample());
          }
        }),
        stdMenuItem({
          id: 'inline-notification-permanent',
          textContent: 'Show permanent inline notification',
          action: () => {
            this.ctl.notify('This is a permanent inline notification');
          }
        }),
        stdMenuItem({
          id: 'transient-inline-notification',
          textContent: 'Show transient inline notification',
          action: () => {
            this.ctl.notify('This is a transient inline notification', { duration: 3000 });
          }
        }),
        stdMenuItem({
          id: 'alert',
          textContent: 'Show alert',
          action: async () => {
            console.log('before alert...');
            const alert = this.ctl.alert({
              message: 'Main message',
              additional: 'This is some additional info'
            });
            await alert.userClicksOk();
            console.log('after alert...');
          }
        }),
        stdMenuItem({
          id: 'confirm',
          textContent: 'Confirm',
          action: async () => {
            console.log('before confirm...');
            const confirm = this.ctl.confirm({
              message: 'Main message',
              additional: 'This is some additional info'
            });
            const yes = await confirm.userChooses();
            console.log('after confirm...', yes);
          }
        }),
        stdMenuItem({
          id: 'test-notification-api',
          textContent: 'Test Notification API...',
          action: () => {
            this.ctl.notify(
              'You may need to (1) use https; (2) allow notifications for your browser in your OS; (3) allow notifications in the browser for this origin.'
            );
            if (!('Notification' in window)) {
              // Check if the browser supports notifications
              this.ctl.alert({
                message: 'Not Supported',
                additional: 'Notification API is not supported in this browser.'
              });
            } else if (Notification.permission === 'granted') {
              // Check whether notification permissions have already been granted;
              // if so, create a notification
              new Notification('Hi there!');
              // …
            } else if (Notification.permission !== 'denied') {
              // We need to ask the user for permission
              Notification.requestPermission().then((permission) => {
                // If the user accepts, let's create a notification
                if (permission === 'granted') {
                  new Notification('Hi there!');
                }
              });
            }
          }
        }),
        stdMenuItem({
          id: 'blank-html-item',
          htmlContentUnsafe: '<p>Html <b>item</b></p>',
          action: () => {}
        }),
        ...blankItems
      ]
    });
  };
}

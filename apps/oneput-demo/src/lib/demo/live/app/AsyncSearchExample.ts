import { hflex } from '@oneput/oneput';
import type { Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { type LayoutSettings } from './_layout.js';
import { TestInputService } from '../service/TestInputService.js';
import { infoMenuItem } from '@oneput/oneput/shared/ui/menuItems/infoMenuItem.js';
import { DOMUpdater } from '@oneput/oneput';
import type { AppObject } from '@oneput/oneput';
import { icons } from '../icons.js';

export class AsyncSearchExample implements AppObject {
  static create(ctl: Controller) {
    const testInputService = TestInputService.create();
    const outerRightStatus = DOMUpdater.create();
    return new AsyncSearchExample(ctl, testInputService, outerRightStatus);
  }

  constructor(
    private ctl: Controller,
    private testInputService: TestInputService,
    private outerRightStatus: DOMUpdater
  ) {}

  onStart() {
    this.run();
  }

  run() {
    this.ctl.ui.update<LayoutSettings>({
      params: {
        menuTitle: 'Async Search Example',
        outerRight: (b) =>
          b.fchild({
            onMount: this.outerRightStatus.onMount
          })
      }
    });
    this.ctl.menu.fn.setMenuItemsFnAsync(
      async (input) => {
        try {
          this.outerRightStatus.withNode((node) => {
            node.innerHTML = 'Fetching data...';
          });
          const results = await this.testInputService.fetchData(input);
          return results.map((result) => {
            this.ctl.clearNotifications();
            return stdMenuItem({
              id: result.id,
              textContent: `Result: '${result.text}'`,
              left: (b) => [b.icon(icons.Dot)],
              action: () => {
                this.outerRightStatus.withNode((node) => {
                  node.innerHTML = `Selected: ${result}`;
                });
              }
            });
          });
        } catch (error) {
          this.setError(error as Error);
          return;
        }
      },
      {
        onDebounce: (isDebouncing) => {
          if (this.isError && !isDebouncing) {
            return;
          } else {
            this.outerRightStatus.withNode((node) => {
              node.innerHTML = isDebouncing ? 'Debouncing...' : 'Ready';
            });
            this.setBusy(isDebouncing);
          }
        },
        focusBehaviour: 'last'
      }
    );
    this.ctl.input.setPlaceholder('Start typing something...');
    this.ctl.menu.setMenuItems({
      id: 'main',
      items: [
        infoMenuItem({
          id: 'instructions',
          msg:
            'Start typing something and inspect the browser console.  ' +
            'Items are delayed but only latest items should show when debounce times out.  ' +
            'The service will randomly fail 10% of the time.',
          icon: icons.Info
        })
      ]
    });
    this.ctl.input.focusInput();
  }

  private isError = false;

  private setError(error: Error) {
    console.error(error);
    this.outerRightStatus.withNode((node) => {
      node.innerHTML = '⚠️ Error';
    });
    this.isError = true;
    const alert = this.ctl.alert({
      message: 'An error!',
      additional:
        'This is a simulated error.  Check the browser console...  Try hitting the refresh icon in the input area to re-run your last input.  Or you can hit ok here and not re-run the input.  Here was the error:' +
        error
    });
    this.ctl.ui.setInputUI((current) => ({
      ...current,
      right: hflex({
        id: 'input-right-1',
        children: (b) => [
          b.iconButton(icons.RefreshCw, {
            title: 'Error',
            attr: {
              onclick: () => {
                alert.cancel();
                this.ctl.menu.fn.triggerMenuItemsFn();
              }
            }
          })
        ]
      })
    }));
  }

  private setBusy(busy: boolean) {
    this.isError = false;
    if (busy) {
      this.ctl.ui.setInputUI((current) => ({
        ...current,
        right: hflex({
          id: 'input-right-1',
          children: (b) => [b.icon(icons.RefreshCw, { classes: ['oneput__rotate'] })]
        })
      }));
    } else {
      this.ctl.ui.setInputUI((current) => ({
        ...current,
        right: undefined
      }));
    }
  }

  onExit = () => {
    this.ctl.clearNotifications();
  };
}

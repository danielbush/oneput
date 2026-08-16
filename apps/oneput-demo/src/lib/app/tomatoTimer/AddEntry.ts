import type {
  AppLayoutParams,
  AppObject,
  Controller,
  MenuItem,
  OneputProps,
  UIFlags
} from '@oneput/oneput';
import { isPickDurationResult, SetDuration } from '@oneput/oneput/shared/appObjects/SetDuration.js';
import { isPickDateTimeResult, SetDateTime } from './SetDateTime.js';
import { isSetNoteResult, SetNote } from './SetNote.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import type { FinishedSession } from './TomatoTimerValue.js';
import { DynamicText } from '@oneput/oneput/shared/ui/DynamicText.js';
import { DynamicPlaceholder } from '@oneput/oneput/shared/ui/DynamicPlaceholder.js';
import { TimeVal } from '@oneput/oneput/shared/lib/time/TimeVal.js';
import { DateTimeVal } from '@oneput/oneput/shared/lib/time/DateTimeVal.js';
import { DateVal } from '@oneput/oneput/shared/lib/time/DateVal.js';
import { icons } from '../_icons.js';

/** Tagged resume payload when Add Entry submits. */
export type AddEntryResult = {
  type: 'add-entry';
  value: FinishedSession;
};

export function isAddEntryResult(payload: unknown): payload is AddEntryResult {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as AddEntryResult).type === 'add-entry' &&
    typeof (payload as AddEntryResult).value === 'object' &&
    (payload as AddEntryResult).value !== null
  );
}

export class AddEntry implements AppObject {
  static create(ctl: Controller, session: Partial<FinishedSession>) {
    return new AddEntry(
      ctl,
      session,
      DynamicPlaceholder.create(ctl, (params) =>
        params.doActionBinding
          ? `Press ${params.doActionBinding} to edit note…`
          : 'Open Note to edit…'
      )
    );
  }

  private unsubscribeInputChange?: () => void;

  constructor(
    private ctl: Controller,
    private session: Partial<FinishedSession>,
    private multilineNotePlaceholder: DynamicPlaceholder
  ) {}

  settings = {
    enableFilter: false,
    clearInputAfterAction: false,
    clearInputAfterBack: false
  } satisfies UIFlags;

  /** Back discards (same as Cancel). Always confirm: a blank entry is still valid. */
  onBack = () => {
    void this.discard();
  };

  onExit = () => {
    this.stopFieldInput();
  };

  onResume = (result?: { payload?: unknown }) => {
    if (isPickDurationResult(result?.payload)) {
      this.session.duration = result.payload.value;
    }
    if (isPickDateTimeResult(result?.payload)) {
      this.session.startTime = result.payload.value;
    }
    if (isSetNoteResult(result?.payload)) {
      this.session.note = result.payload.value;
    }
    this.run();
  };

  onMenuItemFocus = ({ menuItem }: { menuItem: MenuItem | undefined }) => {
    const item = menuItem;
    if (!item) {
      return;
    }
    this.stopFieldInput();
    this.ctl.ui.setInputUI((current) => {
      return {
        ...current,
        textArea: false
      } satisfies OneputProps['inputUI'];
    });
    this.ctl.input.focusInput();
    this.ctl.ui.update({ flags: { enableInputElement: true } });
    switch (item.id) {
      case 'add-label':
        this.ctl.input.setPlaceholder('Enter label...');
        this.ctl.input.setInputValue(this.session.label ?? '');
        this.unsubscribeInputChange = this.ctl.events.on('input-change', ({ value }) => {
          this.session.label = value;
          this.ctl.menu.setMenu({ id: 'main', focusBehaviour: 'none', items: this.menuItems });
        });
        break;
      case 'add-note': {
        const note = this.session.note ?? '';
        if (note.includes('\n')) {
          this.ctl.ui.update({ flags: { enableInputElement: false } });
          this.ctl.input.setPlaceholder(this.multilineNotePlaceholder);
          this.ctl.input.setInputValue();
          break;
        }
        this.ctl.input.setPlaceholder('Enter note...');
        this.ctl.input.setInputValue(note);
        this.unsubscribeInputChange = this.ctl.events.on('input-change', ({ value }) => {
          this.session.note = value;
          this.ctl.menu.setMenu({ id: 'main', focusBehaviour: 'none', items: this.menuItems });
        });
        break;
      }
      case 'add-duration':
        this.ctl.input.setPlaceholder('Set duration…');
        this.ctl.ui.update({ flags: { enableInputElement: false } });
        this.ctl.input.setInputValue();
        break;
      case 'add-startTime':
        this.ctl.input.setPlaceholder('Set start time and date...');
        this.ctl.ui.update({ flags: { enableInputElement: false } });
        this.ctl.input.setInputValue();
        break;
      case 'add-cancel':
        this.ctl.input.setPlaceholder('Cancel…');
        this.ctl.ui.update({ flags: { enableInputElement: false } });
        this.ctl.input.setInputValue();
        break;
    }
  };

  onStart() {
    this.run();
  }

  run() {
    this.ctl.ui.update({
      params: {
        menuTitle: 'Add entry...',
        inputAccept: {
          run: () => this.submit(),
          label: this.ctl.keys.getCurrentBindings()[OneputAction.SUBMIT]?.bindings[0]
        }
      } satisfies AppLayoutParams
    });
    this.ctl.input.setSubmitHandler(() => this.submit());
    this.ctl.menu.clearGenerative();
    this.ctl.menu.setMenu({
      id: 'main',
      // 'first' for onStart.
      // 'last-action' for onResume.
      focusBehaviour: 'last-action,first',
      items: this.menuItems
    });
  }

  private stopFieldInput() {
    this.unsubscribeInputChange?.();
    this.unsubscribeInputChange = undefined;
  }

  private submit() {
    this.ctl.app.exit(this.result());
  }

  private async discard() {
    const confirm = this.ctl.confirm({
      message: 'Discard this entry?'
    });
    const yes = await confirm.userChooses();
    if (!yes) {
      return;
    }
    this.ctl.app.exit();
  }

  private result(): AddEntryResult {
    const startTime = this.session.startTime ?? Date.now() / 1000;
    const duration = this.session.duration ?? 30 * 60;
    return {
      type: 'add-entry',
      value: {
        label: this.session.label ?? null,
        note: this.session.note ?? null,
        startTime,
        duration,
        endTime: this.session.endTime ?? startTime + duration,
        pauseStartTime: this.session.pauseStartTime ?? null,
        pauseDuration: this.session.pauseDuration ?? 0
      }
    };
  }

  get menuItems() {
    return [
      stdMenuItem({
        id: 'add-label',
        textContent: this.session.label ? `Label: ${this.session.label}` : 'Label...',
        left: (b) => [b.icon(icons.Tag)],
        action: () => {
          this.ctl.input.focusInput();
        }
      }),
      stdMenuItem({
        id: 'add-note',
        textContent: this.session.note
          ? `Note: ${this.session.note.replace(/\n/g, ' ').substring(0, 40)}${this.session.note.length > 40 ? '…' : ''}`
          : 'Note...',
        left: (b) => [b.icon(icons.NotebookPen)],
        right: (b) => [b.icon(icons.ChevronRight)],
        action: () => {
          this.stopFieldInput();
          this.ctl.app.run(SetNote.create(this.ctl, { note: this.session.note ?? '' }));
        },
        bottom: {
          textContent: DynamicText.create(this.ctl).text((t) =>
            (this.session.note ?? '').includes('\n')
              ? `Press ${t.doActionBinding} to edit note...`
              : `Press ${t.doActionBinding} to write a longer note...`
          )
        }
      }),
      stdMenuItem({
        id: 'add-duration',
        textContent: this.session.duration
          ? `Set Duration: ${TimeVal.createFromSeconds(this.session.duration).longTimeString}`
          : 'Set Duration...',
        left: (b) => [b.icon(icons.Timer)],
        right: (b) => [b.icon(icons.ChevronRight)],
        action: () => {
          this.stopFieldInput();
          this.ctl.app.run(
            SetDuration.create(this.ctl, {
              duration:
                this.session.duration === undefined
                  ? undefined
                  : TimeVal.createFromSeconds(this.session.duration),
              icons: { Cancel: icons.CircleX }
            })
          );
        }
      }),
      stdMenuItem({
        id: 'add-startTime',
        textContent: this.session.startTime
          ? 'Set time: ' +
            DateTimeVal.createFromUnixTime(this.session.startTime).dateTimeString +
            '...'
          : 'Start time...',
        left: (b) => [b.icon(icons.CalendarCheck)],
        right: (b) => [b.icon(icons.ChevronRight)],
        action: () => {
          this.stopFieldInput();
          this.ctl.app.run(
            SetDateTime.create(this.ctl, {
              icons: {
                SetDateIcon: icons.CalendarCheck,
                SetTimeIcon: icons.Clock,
                Right: icons.ChevronRight,
                PreviousMonth: icons.ChevronLeft,
                NextMonth: icons.ChevronRight,
                PreviousYear: icons.ChevronsLeft,
                NextYear: icons.ChevronsRight,
                Cancel: icons.CircleX
              },
              date:
                this.session.startTime === undefined
                  ? undefined
                  : DateVal.createFromUnixTime(this.session.startTime),
              time:
                this.session.startTime === undefined
                  ? undefined
                  : TimeVal.createFromUnixTime(this.session.startTime)
            })
          );
        }
      }),
      stdMenuItem({
        id: 'add-cancel',
        textContent: 'Cancel',
        left: (b) => [b.icon(icons.CircleX)],
        bindingHint: this.ctl.keys.getCurrentBindings()[OneputAction.BACK]?.bindings[0],
        action: () => {
          this.ctl.app.goBack();
        }
      })
    ];
  }
}

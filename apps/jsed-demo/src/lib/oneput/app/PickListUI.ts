import { type AppObject, type Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { type LayoutSettings } from './_layout.js';
import { icons } from './_icons.js';

export type Candidate = {
  id: string;
  title: string;
  action: () => void;
  /**
   * Name of registered icon.
   */
  icon?: string;
};

export type ManualEntry = {
  prompt: string;
  title: string;
  icon?: string;
  action: (item: string) => void;
};

export class PickListUI implements AppObject {
  static create(
    ctl: Controller,
    {
      title,
      prompt,
      candidates,
      manualEntry
    }: {
      title: string;
      prompt: string;
      candidates: Candidate[];
      manualEntry?: ManualEntry;
    }
  ) {
    return new PickListUI(ctl, title, prompt, candidates, manualEntry);
  }

  private constructor(
    private ctl: Controller,
    private title: string,
    private prompt: string,
    private candidates: Candidate[],
    private manualEntry?: ManualEntry
  ) {}

  onStart = () => {
    this.ctl.ui.update<LayoutSettings>({ params: { menuTitle: this.title } });
    this.ctl.input.setPlaceholder(this.prompt);
    this.ctl.input.focus();
  };

  onResume = () => {
    this.exit(); // from ManualEntryUI
  };

  actions = {
    closeMenu: {
      action: () => {
        this.exit();
      }
    },
    back: {
      action: () => {
        this.exit();
      }
    }
  };

  private exit = () => {
    this.ctl.app.exit();
    this.ctl.menu.closeMenu();
  };

  menu = () => {
    return {
      id: 'PickCandidate',
      items: [
        ...this.candidates.map((candidate) =>
          stdMenuItem({
            id: candidate.id,
            textContent: candidate.title,
            action: () => {
              candidate.action();
              this.ctl.app.exit();
            },
            left: (b) => [b.icon(candidate.icon ?? icons.ArrowRight)]
          })
        ),
        this.manualEntry &&
          stdMenuItem({
            id: 'MANUAL_ENTRY',
            textContent: this.manualEntry.title,
            action: () => {
              this.ctl.app.run(ManualEntryUI.create(this.ctl, this.manualEntry!));
            },
            left: (b) => [b.icon(this.manualEntry!.icon ?? icons.Pencil)],
            closeMenuOnAction: false
          })
      ]
    };
  };
}

class ManualEntryUI implements AppObject {
  static create(ctl: Controller, params: ManualEntry) {
    return new ManualEntryUI(ctl, params.title, params.prompt, params.action);
  }

  constructor(
    private ctl: Controller,
    private title: string,
    private prompt: string,
    private action: (item: string) => void
  ) {}

  onStart = () => {
    this.ctl.ui.update<LayoutSettings>({
      params: { menuTitle: this.title },
      flags: {
        enableMenuOpenClose: false,
        enableMenuItemsFn: false
      }
    });
    this.ctl.input.setPlaceholder(this.prompt);
    this.ctl.input.setSubmitHandler(this.handleSubmit);
    this.ctl.input.focus();
  };

  actions = {
    submit: {
      action: () => {
        const item = this.ctl.input.getInputValue();
        if (item) {
          this.handleSubmit(item);
        }
      },
      binding: {
        bindings: ['Enter'],
        description: 'Submit input',
        when: { menuOpen: true }
      }
    }
  };

  handleSubmit = (input: string) => {
    this.action(input);
    this.ctl.app.exit();
  };
}

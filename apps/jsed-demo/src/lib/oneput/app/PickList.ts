import { bindings, type AppObject, type Controller } from '@oneput/oneput';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { type LayoutSettings } from './_layout.js';
import { icons } from './_icons.js';

export type Candidate = { id: string; title: string; action: () => void };

export class PickList implements AppObject {
  static create(
    ctl: Controller,
    {
      title,
      prompt,
      candidates
    }: {
      title: string;
      prompt: string;
      candidates: Candidate[];
    }
  ) {
    return new PickList(ctl, title, prompt, candidates);
  }

  private constructor(
    private ctl: Controller,
    private title: string,
    private prompt: string,
    private candidates: Candidate[]
  ) {}

  onStart = () => {
    // this.ctl.ui.update({ flags: { enableMenuItemsFn: false } });
    this.ctl.ui.update<LayoutSettings>({ params: { menuTitle: this.title } });
    this.ctl.ui.update({ flags: { enableInputElement: false } });
    this.ctl.input.setPlaceholder(this.prompt);
    // this.ctl.input.setInputValue(tagName).then(() => {
    //   this.ctl.input.selectAll();
    // });
    // this.ctl.input.focusInput();
    // this.ctl.input.setSubmitHandler(this.apply);
    // this.renderMenuItems();
    // // this.ctl.events.on('input-change', () => {
    //   this.renderMenuItems();
    // });
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
      items: this.candidates.map((candidate) =>
        stdMenuItem({
          id: candidate.id,
          textContent: candidate.title,
          action: () => {
            candidate.action();
            this.ctl.app.exit();
          },
          left: (b) => [b.icon(icons.ArrowRight)]
        })
      )
    };
  };
}

import type { AppLayoutParams, AppObject, Controller, OneputProps, UIFlags } from '@oneput/oneput';
import {
  chatSessionItem,
  type ChatSessionTurn
} from '@oneput/oneput/shared/ui/menuItems/chatSessionItem.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { AsyncEliza } from '$lib/eliza/AsyncEliza.js';
import { icons } from './_icons.js';

const SESSION_ID = 'eliza-chat-session';

/**
 * Demo AppObject: chat via Norbert Landsteiner’s elizabot.js (mass:werk 2005),
 * as documented at https://www.cs.vu.nl/~eliens/demo/sample-js-eliza-bot.htm
 * — rendered with {@link chatSessionItem}.
 *
 * ELIZA is wrapped in {@link AsyncEliza} so replies are awaited (simulated latency).
 */
export class ElizaChat implements AppObject {
  static create(ctl: Controller) {
    return new ElizaChat(ctl, AsyncEliza.create());
  }

  private turns: ChatSessionTurn[] = [];
  private busy = false;

  private constructor(
    private ctl: Controller,
    private eliza: AsyncEliza
  ) {}

  layout = {
    params: {
      menuTitle: 'ELIZA'
    } satisfies AppLayoutParams
  };

  settings = {
    enableMenuOpenClose: false,
    enableFilter: false
  } satisfies UIFlags;

  menu = () => ({
    id: 'eliza-chat',
    focusBehaviour: 'none' as const,
    items: [
      chatSessionItem({
        id: SESSION_ID,
        turns: this.turns,
        jumpIcon: icons.ChevronDown,
        jumpTitle: 'Jump to latest'
      }),
      stdMenuItem({
        id: 'eliza-clear',
        textContent: 'Clear chat',
        left: (b) => [b.icon(icons.CircleX)],
        action: () => {
          void this.clear();
        }
      })
    ]
  });

  onStart() {
    this.turns = [{ role: 'agent', text: this.eliza.getInitial() }];
    this.ctl.ui.setInputUI((current) => {
      return {
        ...current,
        textArea: { rows: 2 }
      } satisfies OneputProps['inputUI'];
    });
    this.ctl.input.setPlaceholder('Talk to ELIZA…');
    this.ctl.input.setInputValue('');
    this.ctl.input.setSubmitHandler((text) => {
      void this.send(text);
    });
    this.ctl.input.focusInput();
  }

  private async clear() {
    this.eliza.reset();
    this.turns = [{ role: 'agent', text: this.eliza.getInitial() }];
    this.busy = false;
    this.ctl.menu.invalidate();
  }

  private async send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || this.busy) return;

    this.busy = true;
    this.turns = [...this.turns, { role: 'user', text: trimmed }];
    this.ctl.input.setInputValue('');
    this.ctl.menu.invalidate();

    try {
      const reply = await this.eliza.transform(trimmed);
      this.turns = [...this.turns, { role: 'agent', text: reply }];
      this.ctl.menu.invalidate();

      if (this.eliza.quit) {
        this.ctl.notify('ELIZA ended the session', { duration: 3000 });
      }
    } finally {
      this.busy = false;
    }
  }
}

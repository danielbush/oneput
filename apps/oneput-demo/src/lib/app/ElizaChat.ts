import type { AppLayoutParams, AppObject, Controller, OneputProps, UIFlags } from '@oneput/oneput';
import {
  scrollTranscriptMenuItem,
  type TranscriptTurn
} from '@oneput/oneput/shared/ui/menuItems/scrollTranscriptMenuItem.js';
import { stdMenuItem } from '@oneput/oneput/shared/ui/menuItems/stdMenuItem.js';
import { ElizaBot } from '$lib/eliza/elizabot.js';
import { icons } from './_icons.js';

const TRANSCRIPT_ID = 'eliza-transcript';

/**
 * Demo AppObject: chat via Norbert Landsteiner’s elizabot.js (mass:werk 2005),
 * as documented at https://www.cs.vu.nl/~eliens/demo/sample-js-eliza-bot.htm
 * — rendered with {@link scrollTranscriptMenuItem}.
 */
export class ElizaChat implements AppObject {
  static create(ctl: Controller) {
    return new ElizaChat(ctl, new ElizaBot());
  }

  private turns: TranscriptTurn[] = [];

  private constructor(
    private ctl: Controller,
    private eliza: InstanceType<typeof ElizaBot>
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
      scrollTranscriptMenuItem({
        id: TRANSCRIPT_ID,
        turns: this.turns,
        jumpIcon: icons.ChevronDown,
        jumpTitle: 'Jump to latest'
      }),
      stdMenuItem({
        id: 'eliza-clear',
        textContent: 'Clear chat',
        left: (b) => [b.icon(icons.CircleX)],
        action: () => {
          this.clear();
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
      this.send(text);
    });
    this.ctl.input.focusInput();
  }

  private clear() {
    this.eliza.reset();
    this.turns = [{ role: 'agent', text: this.eliza.getInitial() }];
    this.ctl.menu.invalidate();
  }

  private send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    this.turns = [...this.turns, { role: 'user', text: trimmed }];
    const reply = this.eliza.transform(trimmed);
    this.turns = [...this.turns, { role: 'agent', text: reply }];
    this.ctl.input.setInputValue('');
    this.ctl.menu.invalidate();

    if (this.eliza.quit) {
      this.ctl.notify('ELIZA ended the session', { duration: 3000 });
    }
  }
}

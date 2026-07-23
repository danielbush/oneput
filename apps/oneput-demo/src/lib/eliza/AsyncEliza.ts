import { ElizaBot } from './elizabot.js';

const DEFAULT_DELAY_MS = 700;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Thin async façade over {@link ElizaBot} so the demo chat looks like a
 * real agent turn (network / model latency) instead of an instant sync reply.
 */
export class AsyncEliza {
  static create(opts?: { delayMs?: number; noRandom?: boolean }) {
    return new AsyncEliza(new ElizaBot(opts?.noRandom), opts?.delayMs ?? DEFAULT_DELAY_MS);
  }

  private constructor(
    private bot: InstanceType<typeof ElizaBot>,
    private delayMs: number
  ) {}

  get quit() {
    return this.bot.quit;
  }

  getInitial() {
    return this.bot.getInitial();
  }

  reset() {
    this.bot.reset();
  }

  async transform(input: string): Promise<string> {
    await wait(this.delayMs);
    return this.bot.transform(input);
  }
}

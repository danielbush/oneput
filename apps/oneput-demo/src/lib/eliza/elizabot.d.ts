declare module '$lib/eliza/elizabot.js' {
  export class ElizaBot {
    quit: boolean;
    memSize: number;
    constructor(noRandomFlag?: boolean);
    transform(inputstring: string): string;
    getInitial(): string;
    getFinal(): string;
    reset(): void;
  }
  export default ElizaBot;
}

declare module '$lib/eliza/elizadata.js' {
  export const elizaInitials: string[];
  export const elizaFinals: string[];
  export const elizaQuits: string[];
  export const elizaPres: string[];
  export const elizaPosts: string[];
  export const elizaSynons: Record<string, string[]>;
  export const elizaKeywords: unknown[];
  export const elizaPostTransforms: RegExp[];
}
